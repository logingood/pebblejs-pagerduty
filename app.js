/**
 *  Code was inspired by http://euri.ca/2014/using-pebble-js-to-hit-pagerduty/
 *  Uses https://pebble.github.io/pebblejs/
 *
 *  This application allows to receive pagerduty incidents on your Pebble Watch and
 *  Acknowledge them or Acknowledge all incidents
 *
 *  Resolving incidents is WIP
 *
 */

var UI = require('ui');
var Vector2 = require('vector2');
var Vibe = require('ui/vibe');

var user_id;
var token;
var subdomain;
var email;

Pebble.addEventListener("ready", function(e) {
});

Pebble.addEventListener("showConfiguration", function(_event) {
  var url = 'https://murat1985.github.io/pebblejs-pagerduty/#';
  for(var i = 0, x = 4; i < x; i++) {
    var key = localStorage.key(i);
    var val = localStorage.getItem(key);
    if(val != null) {
      url += "&" + encodeURIComponent(key) + "=" + encodeURIComponent(val);
    }
  }
  Pebble.openURL(url);
});
var configData;

Pebble.addEventListener('webviewclosed', function(e) {
  // Decode the user's preferences
  var key;
  configData = JSON.parse(decodeURIComponent(e.response));
  for(key in configData) {
    localStorage.setItem(key, configData[key]);
  }
});

console.log("Getting configuration from local storage");

user_id = localStorage.getItem('user_id');
token = localStorage.getItem('token');
email = localStorage.getItem('email');
subdomain =  localStorage.getItem('subdomain');
var str = "";

// 10000ms = 10 seconds
var polling_interval = 10000;

var page = new Object();
var page_result = new Object();
var menu_page = new Object();
var wind = new UI.Window();


var textfield;

var ajax = require('ajax');
var count = -1;
var interval;

// Query Incidents
QueryIncidents = function(all) {
  ajax(
    {
      url: 'https://'+subdomain+'.pagerduty.com/api/v1/incidents/?status=triggered,acknowledged&assigned_to_user='+user_id,
      type: 'json',
      headers: {
        Authorization: 'Token token='+token,
        contentType: 'application/json; charset=utf-8'
      }
    },
    function (status) {
      updateScreen(status, all);
    },
    function (error) {
      console.log("Error:");
      console.log(error);
    }
  );
};
// Get Pages for acknowledgement
GetPagesToAck = function(e) {
  ajax(
    {
      url: 'https://'+subdomain+'.pagerduty.com/api/v1/incidents/?status=triggered&assigned_to_user='+user_id,
      type: 'json',
      headers: {
        Authorization: 'Token token='+token,
        contentType: 'application/json; charset=utf-8'
      }
    },
    function(data) {
      AckAll(data);
    },
    function (error) {
      console.log("Error:");
      console.log(error);
    }
  );
};
// Show ack confirmation card
showStatusCard = function(status) {
  page_result[status.incident_number] = new UI.Card();
  page_result[status.incident_number].title(status.incident_number);
  page_result[status.incident_number].body('Status: ' + status.status + ' ' + status.created_on);
  page_result[status.incident_number].show();
}

// Acknowledge one page
AckIncident = function (IncId) {
  console.log("Ack incident:");
  console.log(IncId);
  ajax(
    {
      url: 'https://'+subdomain+'.pagerduty.com/api/v1/incidents/'+IncId+'/acknowledge',
      type: 'json',
      method: 'put',
      data: { "requester_id": user_id },
      crossDomain: true,
      headers: {
        Authorization: 'Token token='+token
      }
    },
    function (status) {
      showStatusCard(status);
    }
  );
}

// Acknowledge all Pages based on JSON input passed
AckAll = function (data) {
  var IncId;
  count = data.total || 0;
  if ( count > 0 ) {
    for ( var i = 0; i < count; i++) {
      IncId = data.incidents[i].id;
      AckIncident(IncId);
    }
  }
};

// count triggered incidents

triggerCount = function (data) {
  var t_count = 0;
  for (i=0; i<data.total; i++) {
    if (data.incidents[i].status == "triggered") {
      t_count++;
    }
  }
  return t_count;
}

// Get how long I would be on-call
onCalltill = function (str) {
  ajax(
    {
      url: 'https://'+subdomain+'.pagerduty.com/api/v1/users/on_call/?query='+email,
      type: 'json',
      headers: {
        Authorization: 'Token token='+token,
        contentType: 'application/json; charset=utf-8'
      }
    },
    function (status) {
      showOnCalltill(status, str);
    },
    function (error) {
      console.log("Error:");
      console.log(error);
    }
  );
}

// Show textfield with number of incidents and time to off-call
showOnCalltill = function (status, str) {
  // Convert received GMT to local TZ
  if (status.users[0] != null) {
    var date = "You are on-call till\n";
    date = date + new Date(status.users[0].on_call[0].end);
  } else {
    date = "You are off-call";
  }
  textfield.text(str + date);
}

showIncidentMenu = function (Id) {
  menu_page[Id] = new UI.Menu({
    sections: [{
      title: 'What to do with the page ?',
      items: [ 
        { title: 'Ack' }, 
        { title: 'Resolve' } 
      ]
    }]
  });
  menu_page[Id].show();
  menu_page[Id].on('select', function(e) {
    // Ack all if we click up
    AckIncident(Id);
  });
}

// Show incident card
showIncidentPage = function (Host, Service, State, Id) {
  page[Id] = new UI.Card();
  page[Id].title(Host);
  page[Id].body(Service + " " + State);
  page[Id].show();
  page[Id].on('click', 'up', function() {
    showIncidentMenu(Id);    
  });
}

getHostServiceState = function (data) {
  for (i=0; i<data.total; i++) {
    if (data.incidents[i].trigger_summary_data.HOSTNAME) {
      Host = data.incidents[i].trigger_summary_data.HOSTNAME
      Service = data.incidents[i].trigger_summary_data.SERVICEDESC
      State = data.incidents[i].trigger_summary_data.SERVICESTATE
    } else {
      Host = data.incidents[i].service.name;
      Service = data.incidents[i].service.description;
      State = data.incidents[i].trigger_summary_data.subject
    }
    Id = data.incidents[i].id
    // show page
    showIncidentPage(Host, Service, State, Id);
    clearInterval(interval);
    // set 30 seconds
    interval = window.setInterval(function () { QueryIncidents(0) }, 30000);
  }
}

showIncidents = function (data) {
  // Short vibe
  Vibe.vibrate('short');
  // Return Host, Service, State
  getHostServiceState(data);
}

printIncidentsCount = function (new_count, t_count) {
  var str = "Total " + new_count + " pages" + "\n";
  if (t_count >= 0) {
    str = str + "Triggered " + t_count + " pages" + "\n";
  }
  str = str + "\n";
  // getting how long I am on call
  onCalltill(str);
}

updateScreen = function (data, all) {
  var new_count = data.total || 0;
  // triggered incidents count
  var t_count = triggerCount(data)
  if (t_count > 0 || all == 1 ) {
    showIncidents(data);
    clearInterval(interval);
    interval = window.setInterval(function () { QueryIncidents(0) }, 30000);
  } else {
    clearInterval(interval);
    interval = window.setInterval(function () { QueryIncidents(0) }, polling_interval);
  }
  printIncidentsCount(new_count, t_count);
}

// Polling API
interval = window.setInterval(function () { QueryIncidents(0) }, polling_interval);
// Load a basic screen
wind = new UI.Window({ status:
                      { color: 'white',
                        backgroundColor:'black'
                      }
                     });
// Create textfield
textfield = new UI.Text({
  position: new Vector2(0, 0),
  size: new Vector2(144, 168),
  font: 'gothic-24-bold',
  text: "Contacting PagerDuty",
  textAlign: 'center',
  color:'black',
  backgroundColor: 'white'
});

// Add textfield to window
wind.add(textfield);
wind.show();

// Up-click to show menu to Ack All :)
wind.on('click', 'up', function() {
  var menu = new UI.Menu({
    sections: [{
      status: true,
      title: 'Take page action',
      items: [{
        title: 'Ack All'
      }, {
        title: 'Resolve All'
      }]
    }]
  });
  menu.show();
  menu.on('select', function(e) {
    if ( e.itemIndex == 0 ) {
      GetPagesToAck();
    }
  });
});

wind.on('click', 'down', function() {
  QueryIncidents(1);
});
