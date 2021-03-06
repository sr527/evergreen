package providers

import (
	"github.com/evergreen-ci/evergreen"
	"github.com/evergreen-ci/evergreen/cloud/providers/digitalocean"
	"github.com/evergreen-ci/evergreen/cloud/providers/ec2"
	"github.com/evergreen-ci/evergreen/cloud/providers/mock"
	"github.com/evergreen-ci/evergreen/cloud/providers/static"
	"github.com/evergreen-ci/evergreen/model/host"
	. "github.com/smartystreets/goconvey/convey"
	"testing"
)

func TestGetCloudManager(t *testing.T) {
	Convey("GetCloudManager() should return non-nil for all valid provider names", t, func() {

		Convey("EC2 should be returned for ec2 provider name", func() {
			cloudMgr, err := GetCloudManager("ec2", evergreen.TestConfig())
			So(cloudMgr, ShouldNotBeNil)
			So(err, ShouldBeNil)
			So(cloudMgr, ShouldHaveSameTypeAs, &ec2.EC2Manager{})
		})

		Convey("EC2Spot should be returned for ec2-spot provider name", func() {
			cloudMgr, err := GetCloudManager("ec2-spot", evergreen.TestConfig())
			So(cloudMgr, ShouldNotBeNil)
			So(err, ShouldBeNil)
			So(cloudMgr, ShouldHaveSameTypeAs, &ec2.EC2SpotManager{})
		})

		Convey("Static should be returned for static provider name", func() {
			cloudMgr, err := GetCloudManager("static", evergreen.TestConfig())
			So(cloudMgr, ShouldNotBeNil)
			So(err, ShouldBeNil)
			So(cloudMgr, ShouldHaveSameTypeAs, &static.StaticManager{})
		})

		Convey("Mock should be returned for mock provider name", func() {
			cloudMgr, err := GetCloudManager("mock", evergreen.TestConfig())
			So(cloudMgr, ShouldNotBeNil)
			So(err, ShouldBeNil)
			So(cloudMgr, ShouldHaveSameTypeAs, &mock.MockCloudManager{})
		})

		Convey("DigitalOcean should be returned for digitalocean provider name", func() {
			cloudMgr, err := GetCloudManager("digitalocean", evergreen.TestConfig())
			So(cloudMgr, ShouldNotBeNil)
			So(err, ShouldBeNil)
			So(cloudMgr, ShouldHaveSameTypeAs, &digitalocean.DigitalOceanManager{})
		})

		Convey("Invalid provider names should return nil with err", func() {
			cloudMgr, err := GetCloudManager("bogus", evergreen.TestConfig())
			So(cloudMgr, ShouldBeNil)
			So(err, ShouldNotBeNil)
		})

	})

}

func TestIsHostReachable(t *testing.T) {
	Convey("A reachable static host should return true", t, func() {
		// try with a reachable static host
		reachableHost := &host.Host{
			Host:        "localhost",
			Provisioned: true,
			Provider:    evergreen.HostTypeStatic,
		}
		cloudManager, err := GetCloudManager(reachableHost.Provider, evergreen.TestConfig())
		So(err, ShouldBeNil)

		reachable, err := cloudManager.IsSSHReachable(reachableHost, "")
		So(reachable, ShouldBeTrue)
		So(err, ShouldBeNil)
	})
	Convey("An unreachable static host should return false", t, func() {
		// try with an unreachable static host
		reachableHost := &host.Host{
			Host:        "fakehost",
			Provisioned: true,
			Provider:    evergreen.HostTypeStatic,
		}
		cloudManager, err := GetCloudManager(reachableHost.Provider, evergreen.TestConfig())
		So(err, ShouldBeNil)

		reachable, err := cloudManager.IsSSHReachable(reachableHost, "")
		So(reachable, ShouldBeFalse)
		So(err, ShouldBeNil)
	})

}
