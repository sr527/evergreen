  /*
  ReactJS code for the Waterfall page. Grid calls the Architecture class for each distro, and the Architecture class renders each build variant for every version that exists. In each build variant we iterate through all the tasks and render them as well. The row of headers is just a placeholder at the moment.
  */

//Used to display the correct color for each task. Called by BuildVariant.
function getClassName(x){
  if(x.status=="success" || x.status=="inactive" || x.status =="undispatched" || x.status=="failed" || x.status=="started"){
    return x.status;
  }
  return ""
}

//Each BuildVariant class is one group of tasks for an arbitrary commit + distro intersection.
var BuildVariant = React.createClass({displayName: "BuildVariant",
  render: function(){
    var self = this;
    var toReturn; 
    var tasks;

    //Casing on whether or not the version is rolled up
    if (self.props.currVersion.rolled_up){
      return (
        React.createElement("div", {className: "col-xs-2 inactive-build"}, " inactive build ")
      )
    } 
    else {
      tasks = window.serverData.versions[self.props.versionIndex].builds[self.props.archIndex].tasks; 
      var taskStyle = {
        clear: 'both'
      };
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
var Architecture = React.createClass({displayName: "Architecture",
  render: function(){
    var self = this;
    var currArch = self.props.arch;
    
    //Logic for the build history links
    var variantID = "";
    var i = 0;
    while (i < window.serverData.versions.length && variantID === "")
    {
      if (!window.serverData.versions[i].rolled_up) {
        variantID = window.serverData.versions[i].builds[self.props.archIndex].variant_id;
      }
      i++;
    }
    if (variantID === "") {
      console.log("Error: no unrolled up versions on page")
    }


    //Styling
    var buildColStyle = {
      'textAlign': 'right'
      };

    var rowStyle = {
      'paddingBottom': '10px'
    }

    return (
    React.createElement("div", {className: "row", style: rowStyle}, 
      React.createElement("div", {className: "col-xs-2" + " build-variant-name", style: buildColStyle}, " ", /*the column of build variant (architecture) names*/
         React.createElement("a", {href: "/build_variant/" + project + "/" + variantID}, 
          currArch
           )
      ), 
      React.createElement("div", null, 
        
          window.serverData.versions.map(function(x,i){
            return React.createElement(BuildVariant, {archIndex: self.props.archIndex, currVersion: x, versionIndex: i, key: i})
          })
        
      ), 
      React.createElement("br", null)
    )
    )
  }
});

// The main class that binds to the root div. This contains all the distros, builds, and tasks
var Grid = React.createClass({displayName: "Grid",
  render: function(){
    var self = this;
    var architectures = window.serverData.build_variants.sort();
    return (
    React.createElement("div", null, 
      React.createElement("div", null, 
        
          architectures.sort().map(function(x, i){
            return React.createElement(Architecture, {className: "row", title: x, archIndex: i, key: i, arch: x})
          })
        
      )
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
/*
ReactDOM.render(
  <Headers></Headers>, document.getElementById('headers')
  );

ReactDOM.render(
  <Grid></Grid>, document.getElementById('root')
  );
 */
