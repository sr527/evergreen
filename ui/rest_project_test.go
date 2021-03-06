package ui

import (
	"encoding/json"
	"github.com/codegangsta/negroni"
	"github.com/evergreen-ci/evergreen"
	"github.com/evergreen-ci/evergreen/db"
	"github.com/evergreen-ci/evergreen/model"
	"github.com/evergreen-ci/evergreen/testutil"
	"github.com/evergreen-ci/render"
	. "github.com/smartystreets/goconvey/convey"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"testing"
)

var (
	projectTestConfig = evergreen.TestConfig()
)

func init() {
	db.SetGlobalSessionProvider(db.SessionFactoryFromConfig(projectTestConfig))
}

func TestGetProjectInfo(t *testing.T) {
	uis := UIServer{
		RootURL:     projectTestConfig.Ui.Url,
		Settings:    *projectTestConfig,
		UserManager: testutil.MockUserManager{},
	}
	home := evergreen.FindEvergreenHome()
	uis.Render = render.New(render.Options{
		Directory:    filepath.Join(home, WebRootPath, Templates),
		DisableCache: true,
	})
	router, err := uis.NewRouter()
	testutil.HandleTestingErr(err, t, "error setting up router")
	n := negroni.New()
	n.Use(negroni.HandlerFunc(UserMiddleware(uis.UserManager)))
	n.UseHandler(router)

	Convey("When loading a public project, it should be found", t, func() {
		testutil.HandleTestingErr(db.Clear(model.ProjectRefCollection), t,
			"Error clearing '%v' collection", model.ProjectRefCollection)

		publicId := "pub"
		public := &model.ProjectRef{
			Identifier:  publicId,
			Repo:        "repo1",
			LocalConfig: "buildvariants:\n - name: ubuntu",
		}
		So(public.Insert(), ShouldBeNil)

		url, err := router.Get("project_info").URL("project_id", publicId)
		So(err, ShouldBeNil)
		request, err := http.NewRequest("GET", url.String(), nil)
		So(err, ShouldBeNil)

		response := httptest.NewRecorder()

		Convey("by a public user", func() {
			n.ServeHTTP(response, request)
			outRef := &model.ProjectRef{}
			So(response.Code, ShouldEqual, http.StatusOK)
			So(json.Unmarshal(response.Body.Bytes(), outRef), ShouldBeNil)
			So(outRef, ShouldResemble, public)
		})
		Convey("and a logged-in user", func() {
			request.AddCookie(&http.Cookie{Name: evergreen.AuthTokenCookie, Value: "token"})
			n.ServeHTTP(response, request)
			outRef := &model.ProjectRef{}
			So(response.Code, ShouldEqual, http.StatusOK)
			So(json.Unmarshal(response.Body.Bytes(), outRef), ShouldBeNil)
			So(outRef, ShouldResemble, public)
		})
	})

	Convey("When loading a private project", t, func() {
		testutil.HandleTestingErr(db.Clear(model.ProjectRefCollection), t,
			"Error clearing '%v' collection", model.ProjectRefCollection)

		privateId := "priv"
		private := &model.ProjectRef{
			Identifier: privateId,
			Private:    true,
			Repo:       "repo1",
		}
		So(private.Insert(), ShouldBeNil)

		Convey("users who are not logged in should be denied with a 302", func() {
			url, err := router.Get("project_info").URL("project_id", privateId)
			So(err, ShouldBeNil)
			request, err := http.NewRequest("GET", url.String(), nil)
			So(err, ShouldBeNil)
			response := httptest.NewRecorder()
			n.ServeHTTP(response, request)

			So(response.Code, ShouldEqual, http.StatusFound)
		})

		Convey("users who are logged in should be able to access the project", func() {
			url, err := router.Get("project_info").URL("project_id", privateId)
			So(err, ShouldBeNil)
			request, err := http.NewRequest("GET", url.String(), nil)
			So(err, ShouldBeNil)
			// add auth cookie--this can be anything if we are using a MockUserManager
			request.AddCookie(&http.Cookie{Name: evergreen.AuthTokenCookie, Value: "token"})
			response := httptest.NewRecorder()
			n.ServeHTTP(response, request)

			outRef := &model.ProjectRef{}
			So(response.Code, ShouldEqual, http.StatusOK)
			So(json.Unmarshal(response.Body.Bytes(), outRef), ShouldBeNil)
			So(outRef, ShouldResemble, private)
		})
	})

	Convey("When finding info on a nonexistent project", t, func() {
		url, err := router.Get("project_info").URL("project_id", "nope")
		So(err, ShouldBeNil)

		request, err := http.NewRequest("GET", url.String(), nil)
		So(err, ShouldBeNil)
		response := httptest.NewRecorder()

		Convey("response should contain a sensible error message", func() {
			Convey("for a public user", func() {
				n.ServeHTTP(response, request)
				So(response.Code, ShouldEqual, http.StatusNotFound)
				var jsonBody map[string]interface{}
				err = json.Unmarshal(response.Body.Bytes(), &jsonBody)
				So(err, ShouldBeNil)
				So(len(jsonBody["message"].(string)), ShouldBeGreaterThan, 0)
			})
			Convey("and a logged-in user", func() {
				request.AddCookie(&http.Cookie{Name: evergreen.AuthTokenCookie, Value: "token"})
				n.ServeHTTP(response, request)
				So(response.Code, ShouldEqual, http.StatusNotFound)
				var jsonBody map[string]interface{}
				err = json.Unmarshal(response.Body.Bytes(), &jsonBody)
				So(err, ShouldBeNil)
				So(len(jsonBody["message"].(string)), ShouldBeGreaterThan, 0)
			})
		})
	})
}
