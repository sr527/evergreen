package monitor

import (
	"github.com/evergreen-ci/evergreen"
	"github.com/evergreen-ci/evergreen/db"
	"github.com/evergreen-ci/evergreen/model/task"
	"github.com/evergreen-ci/evergreen/testutil"
	. "github.com/smartystreets/goconvey/convey"
	"testing"
	"time"
)

func TestFlaggingTimedOutHeartbeats(t *testing.T) {

	testConfig := evergreen.TestConfig()

	db.SetGlobalSessionProvider(db.SessionFactoryFromConfig(testConfig))

	Convey("When flagging tasks whose heartbeat has timed out", t, func() {

		// reset the db
		testutil.HandleTestingErr(db.ClearCollections(task.Collection),
			t, "error clearing tasks collection")

		Convey("tasks that are not running should be ignored", func() {

			task1 := &task.Task{
				Id:            "t1",
				Status:        evergreen.TaskUndispatched,
				LastHeartbeat: time.Now().Add(-time.Minute * 10),
			}
			testutil.HandleTestingErr(task1.Insert(), t, "error inserting task")

			task2 := &task.Task{
				Id:            "t2",
				Status:        evergreen.TaskSucceeded,
				LastHeartbeat: time.Now().Add(-time.Minute * 10),
			}
			testutil.HandleTestingErr(task2.Insert(), t, "error inserting task")

			timedOut, err := flagTimedOutHeartbeats()
			So(err, ShouldBeNil)
			So(len(timedOut), ShouldEqual, 0)

		})

		Convey("tasks whose heartbeat has not timed out should be"+
			" ignored", func() {

			task1 := &task.Task{
				Id:            "t1",
				Status:        evergreen.TaskStarted,
				LastHeartbeat: time.Now().Add(-time.Minute * 5),
			}
			testutil.HandleTestingErr(task1.Insert(), t, "error inserting task")

			timedOut, err := flagTimedOutHeartbeats()
			So(err, ShouldBeNil)
			So(len(timedOut), ShouldEqual, 0)

		})

		Convey("tasks whose heartbeat has timed out should be"+
			" picked up", func() {

			task1 := &task.Task{
				Id:            "t1",
				Status:        evergreen.TaskStarted,
				LastHeartbeat: time.Now().Add(-time.Minute * 10),
			}
			testutil.HandleTestingErr(task1.Insert(), t, "error inserting task")

			task2 := &task.Task{
				Id:            "t2",
				Status:        evergreen.TaskDispatched,
				LastHeartbeat: time.Now().Add(-time.Minute * 10),
			}
			testutil.HandleTestingErr(task2.Insert(), t, "error inserting task")

			timedOut, err := flagTimedOutHeartbeats()
			So(err, ShouldBeNil)
			So(len(timedOut), ShouldEqual, 2)
			So(timedOut[0].reason, ShouldEqual, HeartbeatTimeout)
			So(timedOut[1].reason, ShouldEqual, HeartbeatTimeout)

		})

	})
}
