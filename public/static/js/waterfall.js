  /*
  ReactJS code for the Waterfall page. Grid calls the Variant class for each distro, and the Variant class renders each build variant for every version that exists. In each build variant we iterate through all the tasks and render them as well. The row of headers is just a placeholder at the moment.
  */

// Given a version id, build id, and server data, returns the build associated with it 
function getBuildByIds(versionId, buildId, data) {
  return data.versions[versionId].builds[buildId];
}

// This function preprocesses the data given by the server 
// It sorts the array of builds for each version, as well as the array of build variants
function preprocessing(data) {
  // Comparison function used to sort the builds for each version
  function comp(a, b) {
      if (a.build_variant.display_name > b.build_variant.display_name) return 1;
      if (a.build_variant.display_name < b.build_variant.display_name) return -1;
      return 0;
    }

  // Iterates over each version and if it is not rolled up, sorts its list of builds
  // Keeps track of an index for an unrolled up version as well

  _.each(data.versions, function(version, i) {
    if (!version.rolled_up)
    {
      data.unrolledVersionIndex = i;
      data.versions[i].builds = version.builds.sort(comp);
    }
  });

  //Sorts the build variants that Grid uses to show the column on the left-hand side
  data.build_variants = data.build_variants.sort();

}
preprocessing(window.serverData);

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
      React.createElement("div", {"data-tooltip": "tooltip placeholder", className: "waterfall-box"}, 
        React.createElement("a", {href: href, className: "task-result " + status})
      )
    )
  }
}

// All tasks are inactive, so we display the words "inactive build"
class InactiveBuild extends React.Component {
  render() {
    return (
        React.createElement("div", {className: "col-xs-2 inactive-build"}, " inactive build ")
    )
  }
}

// At least one task in the version is non-inactive, so we display all build tasks with their appropiate colors signifying their status
class ActiveBuild extends React.Component {
  render() {
    var tasks = getBuildByIds(this.props.versionIndex, this.props.variantIndex, this.props.data).tasks;
    
    return (
      React.createElement("div", {className: "col-xs-2"}, 
        
          tasks.map(function(x){
            return (
              React.createElement(Task, {key: x.id, task: x}, " ")
            )
          })
        
      )
      )
  }
}

// Each Build class is one group of tasks for an version + build variant intersection
// We case on whether or not a build is active or not, and return either an ActiveBuild or InactiveBuild respectively
class Build extends React.Component{
  render() {
    // Casing on whether or not the version is rolled up
    var data = this.props.data;
    var versionIndex = this.props.versionIndex;
    var variantIndex = this.props.variantIndex;

    var currentVersion = data.versions[versionIndex];
  
    if (currentVersion.rolled_up){
      return (
        React.createElement(InactiveBuild, null)
      )
    }
    else {
      return (
        React.createElement(ActiveBuild, {data: data, versionIndex: versionIndex, variantIndex: variantIndex})
      )
      
    }
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
    React.createElement("div", {className: "row variant-row"}, 

      /* column of build names */
      React.createElement("div", {className: "col-xs-2" + " build-variant-name" + " distro-col"}, 
         React.createElement("a", {href: "/build_variant/" + project + "/" + variantId}, 
          variantDisplayName
           )
      ), 

      /* 5 columns of versions */
      React.createElement("div", null, 
        
          data.versions.map(function(x,i){
            return React.createElement(Build, {key: x.ids[0], data: data, variantIndex: variantIndex, versionIndex: i})
          })
        
      )

    )
    )
  }
}

// The main class that binds to the root div. This contains all the distros, builds, and tasks
class Grid extends React.Component{
  render() {
    var data = this.props.data;

    return (
    React.createElement("div", {classID: "wrapper"}, 
      
        data.build_variants.map(function(x, i){
          return React.createElement(Variant, {key: x, data: data, variantIndex: i, variantDisplayName: x})
        })
      
    )
    )
  }
}



class Root extends React.Component{
  render() {
    return (
      React.createElement("div", null, 
        React.createElement(Grid, {data: this.props.data})
      )
    )
  }
}
