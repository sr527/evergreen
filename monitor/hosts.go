package monitor

import (
	"fmt"
	"time"

	"github.com/evergreen-ci/evergreen"
	"github.com/evergreen-ci/evergreen/cloud"
	"github.com/evergreen-ci/evergreen/cloud/providers"
	"github.com/evergreen-ci/evergreen/hostutil"
	"github.com/evergreen-ci/evergreen/model/distro"
	"github.com/evergreen-ci/evergreen/model/event"
	"github.com/evergreen-ci/evergreen/model/host"
	"github.com/evergreen-ci/evergreen/notify"
	"github.com/evergreen-ci/evergreen/util"
	"github.com/mongodb/grip"
	"github.com/pkg/errors"
)

// responsible for running regular monitoring of hosts
type HostMonitor struct {
	// will be used to determine what hosts need to be terminated
	flaggingFuncs []hostFlagger

	// will be used to perform regular checks on hosts
	monitoringFuncs []hostMonitoringFunc
}

// run through the list of host monitoring functions. returns any errors that
// occur while running the monitoring functions
func (hm *HostMonitor) RunMonitoringChecks(settings *evergreen.Settings) []error {
	grip.Info("Running host monitoring checks...")

	// used to store any errors that occur
	var errors []error

	for _, f := range hm.monitoringFuncs {

		// continue on error to allow the other monitoring functions to run
		if errs := f(settings); errs != nil {
			for _, err := range errs {
				errors = append(errors, err)
			}
		}

	}

	grip.Info("Finished running host monitoring checks")

	return errors

}

// run through the list of host flagging functions, finding all hosts that
// need to be terminated and terminating them
func (hm *HostMonitor) CleanupHosts(distros []distro.Distro, settings *evergreen.Settings) []error {

	grip.Info("Running host cleanup...")

	// used to store any errors that occur
	var errs []error

	for idx, flagger := range hm.flaggingFuncs {
		grip.Infoln("Searching for flagged hosts under criteria:", flagger.Reason)
		// find the next batch of hosts to terminate
		hostsToTerminate, err := flagger.hostFlaggingFunc(distros, settings)
		grip.Infof("Found %v hosts flagged for '%v'", len(hostsToTerminate), flagger.Reason)

		// continuing on error so that one wonky flagging function doesn't
		// stop others from running
		if err != nil {
			errs = append(errs, errors.Wrap(err, "error flagging hosts to be terminated"))
			continue
		}

		grip.Infof("Check %v: found %v hosts to be terminated", idx, len(hostsToTerminate))

		// terminate all of the dead hosts. continue on error to allow further
		// termination to work
		if errs := terminateHosts(hostsToTerminate, settings, flagger.Reason); errs != nil {
			for _, err := range errs {
				errs = append(errs, errors.Wrap(err, "error terminating host"))
			}
			continue
		}
	}

	return errs
}

// terminate the passed-in slice of hosts. returns any errors that occur
// terminating the hosts
func terminateHosts(hosts []host.Host, settings *evergreen.Settings, reason string) []error {
	errChan := make(chan error)
	for _, h := range hosts {
		grip.Infof("Terminating host %v", h.Id)
		// terminate the host in a goroutine, passing the host in as a parameter
		// so that the variable isn't reused for subsequent iterations
		go func(hostToTerminate host.Host) {
			errChan <- func() error {
				event.LogMonitorOperation(hostToTerminate.Id, reason)
				err := util.RunFunctionWithTimeout(func() error {
					return terminateHost(&hostToTerminate, settings)
				}, 12*time.Minute)
				if err != nil {
					if err == util.ErrTimedOut {
						return errors.Errorf("timeout terminating host %s", hostToTerminate.Id)
					}
					return errors.Wrapf(err, "error terminating host %s", hostToTerminate.Id)
				}
				grip.Infoln("Successfully terminated host", hostToTerminate.Id)
				return nil
			}()
		}(h)
	}
	var errors []error
	for range hosts {
		if err := <-errChan; err != nil {
			errors = append(errors, err)
		}
	}
	return errors
}

// helper to terminate a single host
func terminateHost(h *host.Host, settings *evergreen.Settings) error {
	// clear the running task of the host in case one has been assigned.
	if h.RunningTask != "" {
		grip.Warningf("Host has running task: %s. Clearing running task field for host"+
			"before terminating.", h.RunningTask)
		err := h.ClearRunningTask(h.RunningTask, time.Now())
		if err != nil {
			grip.Errorf("Error clearing running task for host: %s", h.Id)
		}
	}
	// convert the host to a cloud host
	cloudHost, err := providers.GetCloudHost(h, settings)
	if err != nil {
		return errors.Errorf("error getting cloud host for %v: %v", h.Id, err)
	}

	// run teardown script if we have one, sending notifications if things go awry
	if h.Distro.Teardown != "" && h.Provisioned {
		grip.Errorln("Running teardown script for host:", h.Id)
		if err := runHostTeardown(h, cloudHost); err != nil {
			grip.Errorf("Error running teardown script for %s: %+v", h.Id, err)
			subj := fmt.Sprintf("%v Error running teardown for host %v",
				notify.TeardownFailurePreface, h.Id)
			if err := notify.NotifyAdmins(subj, err.Error(), settings); err != nil {
				grip.Errorln("Error sending email:", err)
			}
		}
	}

	// terminate the instance
	if err := cloudHost.TerminateInstance(); err != nil {
		return errors.Wrapf(err, "error terminating host %s", h.Id)
	}

	return nil
}

func runHostTeardown(h *host.Host, cloudHost *cloud.CloudHost) error {
	sshOptions, err := cloudHost.GetSSHOptions()
	if err != nil {
		return errors.Wrapf(err, "error getting ssh options for host %s", h.Id)
	}
	startTime := time.Now()
	logs, err := hostutil.RunRemoteScript(h, "teardown.sh", sshOptions)
	event.LogHostTeardown(h.Id, logs, err == nil, time.Since(startTime))
	if err != nil {
		return errors.Wrapf(err, "error running teardown.sh over ssh: %v", logs)
	}
	return nil
}
