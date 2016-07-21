  /*
  ReactJS code for the Waterfall page. Grid calls the Variant class for each distro, and the Variant class renders each build variant for every version that exists. In each build variant we iterate through all the tasks and render them as well. The row of headers is just a placeholder at the moment.
  */

// Given a version id, build id, and server data, returns the build associated with it 
function getBuildByIds(versionId, buildId, data) {
  return data.versions[versionId].builds[buildId];
}

// Preprocess the data given by the server 
// Sort the array of builds for each version, as well as the array of build variants
function preProcessData(data) {
  // Comparison function used to sort the builds for each version
  function comp(a, b) {
      if (a.build_variant.display_name > b.build_variant.display_name) return 1;
      if (a.build_variant.display_name < b.build_variant.display_name) return -1;
      return 0;
    }

  // Iterate over each version and sort the list of builds for unrolled up versions 
  // Keep track of an index for an unrolled up version as well

  _.each(data.versions, function(version, i) {
    if (!version.rolled_up) {
      data.unrolledVersionIndex = i;
      data.versions[i].builds = version.builds.sort(comp);
    }
  });

  //Sort the build variants that Grid uses to show the build column on the left-hand side
  data.build_variants = data.build_variants.sort();
}

preProcessData(window.serverData);

// A Task contains the information for a single task for a build, including the link to its page, and a tooltip
class Task extends React.Component {
  render() {
    // Used to display the correct color for each task
    function getStatus(x){
      if(x.status=="success" || x.status=="inactive" || x.status =="undispatched" || x.status=="failed" || x.status=="started") {
        return x.status;
      }
      else {
        return "";
      }
    }

    var href = "/task/" + this.props.task.id;
    var status = getStatus(this.props.task);

    return (
      <div data-tooltip="tooltip placeholder" className="waterfall-box"> 
        <a href={href} className={"task-result " + status} />  
      </div>
    )
  }
}

// All tasks are inactive, so we display the words "inactive build"
class InactiveBuild extends React.Component {
  render() {
    return <div className="col-xs-2 inactive-build"> inactive build </div>;
  }
}

// At least one task in the version is non-inactive, so we display all build tasks with their appropiate colors signifying their status
class ActiveBuild extends React.Component {
  render() {
    var tasks = getBuildByIds(this.props.versionIndex, this.props.variantIndex, this.props.data).tasks;
    
    return (
      <div className="col-xs-2">
        {
          tasks.map((x) => {
            return <Task key={x.id} task={x} />
          })
        }
      </div>
      )
  }
}

// Each Build class is one group of tasks for an version + build variant intersection
// We case on whether or not a build is active or not, and return either an ActiveBuild or InactiveBuild respectively
class Build extends React.Component{
  render() {
    var currentVersion = this.props.data.versions[this.props.versionIndex];
    
    if (currentVersion.rolled_up) {
      return <InactiveBuild />;
    }

    //We have an active build with tasks
    return (
      <ActiveBuild data={this.props.data} versionIndex={this.props.versionIndex} variantIndex={this.props.variantIndex} />
    )
  }
}

// The class for each "row" of the waterfall page. Includes the build variant link, as well as the five columns
// of versions.
class Variant extends React.Component{
  render() {
    var variantDisplayName = this.props.variantDisplayName;
    var data = this.props.data;
    var variantIndex = this.props.variantIndex;

    var variantId = getBuildByIds(data.unrolledVersionIndex, variantIndex, data).build_variant.id;
    return (
      <div className="row variant-row">

        {/* column of build names */}
        <div className={"col-xs-2" + " build-variant-name" + " distro-col"} > 
          <a href={"/build_variant/" + project + "/" + variantId}>
            {variantDisplayName} 
          </a> 
        </div>

        {/* 5 columns of versions */}
        <div> 
          {
            data.versions.map((x,i) => {
              return <Build key={x.ids[0]} data={data} variantIndex={variantIndex} versionIndex={i} />;
            })
          }
        </div>

      </div>
    )
  }
}

// The main class that binds to the root div. This contains all the distros, builds, and tasks
class Grid extends React.Component{
  render() {
    var data = this.props.data;
    var xuz = data;
    return (
      <div classID="wrapper">
        {
          this.props.data.build_variants.map((x, i) => {
            return <Variant key={x} data={data} variantIndex={i} variantDisplayName={x} />;
          })
        }
      </div>
    )
  }
}

// The Root class renders all components on the waterfall page, including the grid view and the filter and new page buttons
// The one exception is the header, which is written in Angular and managed by menu.html
class Root extends React.Component{
  render() {
    return (
      <div>
        <Grid data={this.props.data} />
      </div>
    )
  }
}
