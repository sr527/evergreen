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
        <a href={href} className={"task-result " + status}></a>  
      </div>
    )
  }
}

class InactiveBuild extends React.Component {
  render() {
    return (
        <div className="col-xs-2 inactive-build"> inactive build </div>
    )
  }
}

class ActiveBuild extends React.Component {
  render() {
    var tasks = getBuildByIds(this.props.versionIndex, this.props.variantIndex, this.props.data).tasks;
    
    return (
      <div className="col-xs-2">
        {
          tasks.map(function(x){
            return (
              <Task key={x.id} task={x}> </Task>
            )
          })
        }
      </div>
      )
  }
}

// Each Build class is one group of tasks for an version + build variant intersection.
class Build extends React.Component{
  render() {
    // Casing on whether or not the version is rolled up
    var data = this.props.data;
    var versionIndex = this.props.versionIndex;
    var variantIndex = this.props.variantIndex;

    var currentVersion = data.versions[versionIndex];
  
    if (currentVersion.rolled_up){
      return (
        <InactiveBuild></InactiveBuild>
      )
    }
    else {
      return (
        <ActiveBuild data={data} versionIndex={versionIndex} variantIndex={variantIndex}></ActiveBuild>
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
          data.versions.map(function(x,i){
            return <Build key={x.ids[0]} data={data} variantIndex={variantIndex} versionIndex={i} />
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

    return (
    <div classID="wrapper">
      {
        data.build_variants.map(function(x, i){
          return <Variant key={x} data={data} variantIndex={i} variantDisplayName={x} />
        })
      }
    </div>
    )
  }
}

/*** START VERSION HEADER CODE ***/
/*
class RolledUpHeader extends React.Component{
  render() {
    return (
      <div> rolled up header </div>
    )
  }
}

// Renders the git commit summary for one version
class VersionHeader extends React.Component{
  render() {
    var currVersion = this.props.data.versions[this.props.versionIndex];
    var message = currVersion.messages[0];

    if (currVersion.rolled_up) {
      var versiontitle = currVersion.messages.length > 1 ? "versions" : "version";
      var rolled_header = currVersion.messages.length + " inactive " + versiontitle; 
      message = rolled_header;
      console.log("rolled up");
      return (
        <div className="col-xs-2">
        {message}
        </div>
      )
    }
    else {
      var author = currVersion.authors[0];
      var id_link = "/version/" + currVersion.ids[0];
      var commit = currVersion.revisions[0].substring(0,5);
      var shortened_message = currVersion.messages[0].substring(0,35);
    
      var date_time = new Date(currVersion.create_times[0]);
      var formatted_time = date_time.toLocaleDateString('en-US', {
        month : 'numeric',
        day : 'numeric',
        year : '2-digit',
        hour : '2-digit',
        minute : '2-digit'
      }).replace(",","");
    }
    
    return (
    <div className="col-xs-2">
    {    <div className="version-header-expanded">
        <div>
          <span className="btn btn-default btn-hash history-item-revision">
            <a href={id_link}>{commit}</a>
          </span>
          {formatted_time}
        </div>
         <span style={{fontWeight: "bold"}}> {author} - </span>
        {shortened_message}
      </div> }
    </div>
    )
  }
}


// The class which renders the "Variant" and git commit summary headers
class Headers extends React.Component{
  render() {
    return (
    <div className="row version-header">
      <div classID="build-variant-col" className="col-xs-2 version-header-full text-right">
        Variant
      </div>
      {
        this.props.data.versions.map(function(x,i){
        return <VersionHeader key={x.ids[0]} versionIndex={i}/>
        })
      }
      <br/>
    </div>
    )
  }
}
*/

/*** END VERSION HEADER CODE ***/


class Root extends React.Component{
  render() {
    return (
      <div>
      {/*  <Headers data={this.props.data}></Headers> */}
        <Grid data={this.props.data}></Grid>
      </div>
    )
  }
}
