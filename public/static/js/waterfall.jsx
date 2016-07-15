  /*
  ReactJS code for the Waterfall page. Grid calls the Variant class for each distro, and the Variant class renders each build variant for every version that exists. In each build variant we iterate through all the tasks and render them as well. The row of headers is just a placeholder at the moment.
  */

// Logic for sorting the builds in each version
// Ideally this would be done in the backend before passing it over to the client
function comp(a, b) {
    if (a.build_variant.display_name > b.build_variant.display_name) return 1;
    if (b.build_variant.display_name > a.build_variant.display_name) return -1;
    return 0;
  }

// Logic for iterating through each version and sorting the builds for each one
// Also keeps track of the index of an unrolled version to iterate through
window.unrolledVersionIndex = 0;
_.map(window.serverData.versions, function(vers, i) {
  var currVersion = window.serverData.versions[i];
  if (!currVersion.rolled_up)
  {
    window.unrolledVersionIndex = i;
    var temp = currVersion.builds;
    window.serverData.versions[i].builds = temp.sort(comp);
  }
});

// Used to display the correct color for each task. Called by Build.
function getStatus(x){
  if(x.status=="success" || x.status=="inactive" || x.status =="undispatched" || x.status=="failed" || x.status=="started") {
    return x.status;
  }
  return "";
}

//Each Build class is one group of tasks for an arbitrary version + build variant intersection.
var Build = React.createClass({
  render: function(){
    var self = this;
    var tasks;

    //Casing on whether or not the version is rolled up
    if (self.props.currVersion.rolled_up){
      return (
        <div className="col-xs-2 inactive-build"> inactive build </div>
      )
    }
    else {
      tasks = window.serverData.versions[self.props.versionIndex].builds[self.props.variantIndex].tasks; 
    }
      
    return (
      <div className="col-xs-2">
        {
          tasks.map(function(x){
            return <div className="waterfall-box" key={x.id}><a href={"/task/"+x.id} className={"task-result " + getStatus(x)}></a> </div>
          })
        }
      </div>
      )
  }
});

// The class for each "row" of the waterfall page. Includes the build variant link, as well as the five columns
// of versions.
var Variant = React.createClass({
  render: function(){
    var self = this;
    var variantDisplayName = self.props.variant;
    
    //Logic for the build history links
    var variantId = window.serverData.versions[window.unrolledVersionIndex].builds[self.props.variantIndex].build_variant.id;
    //The column of build names a
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
          window.serverData.versions.map(function(x,i){
            return <Build variantIndex={self.props.variantIndex} currVersion={x} versionIndex={i}  key={i}/>
          })
        }
      </div>
    </div>
    )
  }
});

// The main class that binds to the root div. This contains all the distros, builds, and tasks
var Grid = React.createClass({
  render: function(){
    var variants = window.serverData.build_variants.sort();
    return (
    <div classID="wrapper">
      {
        variants.sort().map(function(x, i){
          return <Variant className={"row"} title={x} variantIndex={i} key={i} variant={x}/>
        })
      }
    </div>
    )
  }
  });

// Renders the git commit summary for one version
var VersionHeader = React.createClass({
  render: function(){
    return (
    <div className="col-xs-2">(header placeholder)</div>
    )
  }
});

// The class which renders the "Variant" and git commit summary headers
var Headers = React.createClass({
  render: function(){
    return (
    <div className="row">
      <div className="col-xs-2">
        Variant
      </div>
      {
        window.serverData.versions.map(function(x){
        return <VersionHeader key={x.ids[0]}/>
        })
      }
      <br/>
    </div>
    )
  }
});

