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
    var href = "/task/" + this.props.task.id;
    var status = this.props.task.status;

    return (
      React.createElement("div", {"data-tooltip": "tooltip placeholder", className: "waterfall-box"}, 
        React.createElement("a", {href: href, className: "task-result " + status})
      )
    )
  }
}

// For each type of task status, a PartialProgressBar is rendered to only show that part of the bar
// A set of PartialProgressBars make up the entire progress bar that is shown on the Waterfall page
class PartialProgressBar extends React.Component {
  render() {
    var percentage = (this.props.taskNum * 100) / this.props.total;
    var strPercentage = percentage + '%';
    var style = this.props.status;
    
    return (
      React.createElement("div", {className: "progress-bar progress-bar-" + style, role: "progressbar", style: {width:strPercentage}})
    )
  }
}

// A CollapsedBuild contains a set of PartialProgressBars, which in turn make up a full progress bar
// We iterate over the 6 different main types of task statuses, each of which have a different color association
class CollapsedBuild extends React.Component {
  render() {
    var build = getBuildByIds(this.props.versionIndex, this.props.variantIndex, this.props.data);
    var taskStats = build.waterfallTaskStats;

    var taskTypes = [ 
                      ["success"      , taskStats.succeeded], 
                      ["failed"       , taskStats.failed], 
                      ["started"      , taskStats.started], 
                      ["system-failed"     , taskStats.timed_out],
                      ["undispatched" , taskStats.undispatched], 
                      ["inactive"     , taskStats.inactive]
                    ];

    var total = build.tasks.length;

    return (
      React.createElement("div", {className: "full-bar"}, 
        
          taskTypes.map((x) => {
            return React.createElement(PartialProgressBar, {key: x[0], total: total, status: x[0], taskNum: x[1]})
          }) 
        
      )
    )
  }
}

// All tasks are inactive, so we display the words "inactive build"
class InactiveBuild extends React.Component {
  render() {
    return React.createElement("td", {className: "inactive-build build-row"}, " inactive build ");
  }
}

// At least one task in the version is non-inactive, so we display all build tasks with their appropiate colors signifying their status
class ActiveBuild extends React.Component {
  render() {
    var tasks = getBuildByIds(this.props.versionIndex, this.props.variantIndex, this.props.data).tasks;
    var validTasks = this.props.filters;

    // If our filter is defined, we filter our list of tasks to only display certain types
    // Currently we only filter on status, but it would be easy to filter on other task attributes
    if (validTasks != null) {
      tasks = _.filter(tasks, ((x) => { i
        for (var i = 0; i < validTasks.length; i++) {
          if (validTasks[i] === x.status) return true;
        }
        return false;
      }));
    }

    return (
      React.createElement("div", {className: "active-build"}, 
        
          tasks.map((x) => {
            return React.createElement(Task, {key: x.id, task: x})
          })
        
      )
    )
  }
}

// Each Build class is one group of tasks for an version + build variant intersection
// We case on whether or not a build is active or not, and return either an ActiveBuild or InactiveBuild respectively
class Build extends React.Component{
  render() {
    var currentVersion = this.props.data.versions[this.props.versionIndex];
    
    if (currentVersion.rolled_up) {
      return React.createElement(InactiveBuild, null);
    }
   
    var isCollapsed = false; //Will add switch to change isCollapsed state 
    
    if (isCollapsed) {
      var tasksToShow = ['failed']; //Can be modified to show combinations of tasks by statuses
      return (
        React.createElement("td", {className: "build-row"}, 
          
          React.createElement(ActiveBuild, {filters: tasksToShow, data: this.props.data, versionIndex: this.props.versionIndex, variantIndex: this.props.variantIndex}), 
          
          React.createElement(CollapsedBuild, {data: this.props.data, versionIndex: this.props.versionIndex, variantIndex: this.props.variantIndex})

        )
      )
    } 
    
    //We have an active, uncollapsed build 
    return (
      React.createElement("td", {className: "build-row"}, 
        React.createElement(ActiveBuild, {data: this.props.data, versionIndex: this.props.versionIndex, variantIndex: this.props.variantIndex})
      )
    )
  }
}

// The class for each "row" of the waterfall page. Includes the build variant link, as well as the five columns
// of versions.
class Variant extends React.Component{
  render() {
    var data = this.props.data;
    var variantIndex = this.props.variantIndex;
    var variantId = getBuildByIds(data.unrolledVersionIndex, variantIndex, data).build_variant.id;
    
    return (
      React.createElement("tr", {className: "row variant-row"}, 
        /* column of build names */
        React.createElement("td", {className:    " distro-col"}, 
          React.createElement("a", {href: "/build_variant/" + project + "/" + variantId}, 
            this.props.variantDisplayName
          )
        ), 

        /* 5 columns of versions */
          
            data.versions.map((x,i) => {
              return React.createElement(Build, {key: x.ids[0], data: data, variantIndex: variantIndex, versionIndex: i});
            })
          

      )
    )
  }
}

// The main class that binds to the root div. This contains all the distros, builds, and tasks
class Grid extends React.Component{
  render() {
    var data = this.props.data;
    return (
      React.createElement("div", {classID: "wrapper "}, 
        React.createElement("table", {className: "table"}, 
        
          this.props.data.build_variants.map((x, i) => {
            return React.createElement(Variant, {key: x, data: data, variantIndex: i, variantDisplayName: x});
          })
        
        )
      )
    )
  }
}

// The Root class renders all components on the waterfall page, including the grid view and the filter and new page buttons
// The one exception is the header, which is written in Angular and managed by menu.html
class Root extends React.Component{
  render() {
    return (
      React.createElement("div", null, 
        React.createElement(Grid, {data: this.props.data})
      )
    )
  }
}
