  /*
  ReactJS code for the Waterfall page. Grid calls the Variant class for each distro, and the Variant class renders each build variant for every version that exists. In each build variant we iterate through all the tasks and render them as well. The row of headers is just a placeholder at the moment.
  */

//Used to display the correct color for each task. Called by Build.
function getClassName(x){
  if(x.status=="success" || x.status=="inactive" || x.status =="undispatched" || x.status=="failed" || x.status=="started") {
    return x.status;
  }
  return "";
}

//Each Build class is one group of tasks for an arbitrary commit + distro intersection.
var Build = React.createClass({displayName: "Build",
  render: function(){
    var self = this;
    var tasks;

    //Casing on whether or not the version is rolled up
    if (self.props.currVersion.rolled_up){
      return (
        React.createElement("div", {className: "col-xs-2 inactive-build"}, " inactive build ")
      )
    } 
    else {
      tasks = window.serverData.versions[self.props.versionIndex].builds[self.props.variantIndex].tasks; 
    }
      
    return (
      React.createElement("div", {className: "col-xs-2"}, 
        
          tasks.map(function(x){
            return React.createElement("div", {className: "waterfall-box", key: x.id}, React.createElement("a", {href: "/task/"+x.id, className: "task-result " + getClassName(x)}), " ")
          })
        
      )
      )
  }
});

// The class for each "row" of the waterfall page. Includes the build variant link, as well as the five columns
// of versions.
var Variant = React.createClass({displayName: "Variant",
  render: function(){
    var self = this;
    var currVariant = self.props.variant;
    
    //Logic for the build history links
    var variantID = window.serverData.versions[window.unrolledVersionIndex].builds[self.props.variantIndex].variant_id;

    return (
    React.createElement("div", {className: "row variant-row"}, 
      React.createElement("div", {className: "col-xs-2" + " build-variant-name" + " distro-col"}, " ", /*the column of build names*/
         React.createElement("a", {href: "/build_variant/" + project + "/" + variantID}, 
          currVariant
           )
      ), 
      React.createElement("div", null, 
        
          window.serverData.versions.map(function(x,i){
            return React.createElement(Build, {variantIndex: self.props.variantIndex, currVersion: x, versionIndex: i, key: i})
          })
        
      )
    )
    )
  }
});

// The main class that binds to the root div. This contains all the distros, builds, and tasks
var Grid = React.createClass({displayName: "Grid",
  render: function(){
    var variants = window.serverData.build_variants.sort();
    return (
    React.createElement("div", {classID: "wrapper"}, 
      
        variants.sort().map(function(x, i){
          return React.createElement(Variant, {className: "row", title: x, variantIndex: i, key: i, variant: x})
        })
      
    )
    )
  }
  });

// Renders the git commit summary for one version
var VersionHeader = React.createClass({displayName: "VersionHeader",
  render: function(){
    return (
    React.createElement("div", {className: "col-xs-2"}, "(header placeholder)")
    )
  }
});

// The class which renders the "Variant" and git commit summary headers
var Headers = React.createClass({displayName: "Headers",
  render: function(){
    return (
    React.createElement("div", {className: "row"}, 
      React.createElement("div", {className: "col-xs-2"}, 
        "Variant"
      ), 
      
        window.serverData.versions.map(function(x){
        return React.createElement(VersionHeader, {key: x.ids[0]})
        }), 
      
      React.createElement("br", null)
    )
    )
  }
});

ReactDOM.render(
  React.createElement(Headers, null), document.getElementById('headers')
  );

ReactDOM.render(
  React.createElement(Grid, null), document.getElementById('root')
  );
 
