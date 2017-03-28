package comm

import (
	"net/http"

	"github.com/evergreen-ci/evergreen/apimodels"
	"github.com/evergreen-ci/evergreen/model"
	"github.com/evergreen-ci/evergreen/model/distro"
	"github.com/evergreen-ci/evergreen/model/task"
	"github.com/evergreen-ci/evergreen/model/version"
)

// TaskCommunicator is an interface that handles the remote procedure calls
// between an agent and the remote server.
type TaskCommunicator interface {
	Start() error
	End(detail *apimodels.TaskEndDetail) (*apimodels.EndTaskResponse, error)
	GetTask() (*task.Task, error)
	GetProjectRef() (*model.ProjectRef, error)
	GetDistro() (*distro.Distro, error)
	GetVersion() (*version.Version, error)
	Log([]model.LogMessage) error
	Heartbeat() (bool, error)
	FetchExpansionVars() (*apimodels.ExpansionVars, error)
	GetNextTask() (*apimodels.NextTaskResponse, error)
	TryGet(path string, withTask bool) (*http.Response, error)
	TryPostJSON(path string, withTask bool, data interface{}) (*http.Response, error)
}
