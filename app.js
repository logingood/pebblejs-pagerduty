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

var configData;
var user_id;
var token;
var subdomain;
var email;

Pebble.addEventListener("ready", function(e) {
});

Pebble.addEventListener("showConfiguration", function(_event) {
  var url = 'https://murat1985.github.io/pebblejs-pagerduty/';
  url += "#";
  for(var i = 0, x = localStorage.length; i < x; i++) {
    var key = localStorage.key(i);
    var val = localStorage.getItem(key);
    if(val != null) {
      url += "&" + encodeURIComponent(key) + "=" + encodeURIComponent(val);
    }
  }
  console.log(url);
  Pebble.openURL(url);
});
var key;

Pebble.addEventListener('webviewclosed', function(e) {
  // Decode the user's preferences
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

// 4000ms = 4 seconds
var polling_interval = 4000;

var wind = new UI.Window();
var textfield;

var ajax = require('ajax');
var count = -1;
var interval;

// Query Incidents
QueryIncidents = function(e) {
  console.log("updating");
  ajax(
    {
      url: 'https://'+subdomain+'.pagerduty.com/api/v1/incidents/?status=triggered,acknowledged&assigned_to_user='+user_id,
      type: 'json',
      headers: {
        Authorization: 'Token token='+token,
        contentType: 'application/json; charset=utf-8'
      }
    },
    updateScreen,
    function (error) {
      console.log("Error:");
      console.log(error);
    }
  );
};
// Get Pages for acknowledgement
GetPagesToAck = function(e) {
  console.log("updating");
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

// Acknowledge Pages based on JSON input passed
AckAll = function (data) {
  var IncId = "";
  var Payload = { "requester_id": user_id };
  count = data.total || 0;
  if ( count > 0 ) {
    for ( var i = 0; i < count; i++) {
      IncId = data.incidents[i].id;
      console.log("Incident is going to put:" + IncId);
      console.log("Payload = " + Payload.requester_id);
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
          var page2 = new UI.Card({
            title: status.incident_number,
            body: 'Status: ' + status.status + ' ' + status.created_on
          });
          page2.show();
        },
        function (data) {
          console.log('Success and Result is: ' + JSON.stringify(data));
        }
      );
    }
  }
};

// Draw menu to Ack
var menu_page = new UI.Menu({
  sections: [{
    title: 'What to do with the page ?',
    items: [{
      title: 'Ack'
    }, {
      title: 'Resolve'
    }]
  }]
});

// Screen Update very ugly - should rewrite it - TODO
//
updateScreen = function (data) {
  var new_count = data.total || 0;
  console.log("Found " + new_count + " incidents from " + count);
  if (new_count != count) {
    var Host = "";
    var Service = "";
    var State = "";
    var page1 = "";

    if(new_count>count && new_count > 0) {
      Vibe.vibrate('short');
      for (i=0; i<new_count; i++) {
        if (data.incidents[i].trigger_summary_data.HOSTNAME) {
          Host = data.incidents[i].trigger_summary_data.HOSTNAME
          Service = data.incidents[i].trigger_summary_data.SERVICEDESC
          State = data.incidents[i].trigger_summary_data.SERVICESTATE
        } else {
          Host = "Not nagios page";
          Service = "Not nagios page";
          State = data.incidents[i].trigger_summary_data.subject
        }
        console.log("Host: " + Host + " Service " + Service + " State " + State);
        page1 = new UI.Card({
          title: Host,
          body: Service + " " + State
        });
        page1.show();
        page1.on('click', 'up', function() {
          menu_page.show();
          menu_page.on('select', function(e) {
            AckAll(data);
          });
        });
      }
    }
    count = new_count
    str = "You have " + count + " pages" + "\n" +"\n";
    // Getting how long I am on-call
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
        // Convert received GMT to local TZ
        var date = new Date(status.users[0].on_call[0].end);
        str = str + "On call till\n" + date.toString() + "\n";
      },
      function (error) {
        console.log("Error:");
        console.log(error);
      }
    );
  }
  textfield.text(str);
}

// Polling API
QueryIncidents()
interval = window.setInterval(QueryIncidents,polling_interval)

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
  console.log("Should show menu now");
  var menu = new UI.Menu({
    sections: [{
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
      console.log('Item number ' + e.itemIndex  + ' was pressed!');
    }
  });
  console.log("Menu shown");
});
