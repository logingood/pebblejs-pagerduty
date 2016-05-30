# Pebble.js Duty (Pebble.js application for PagerDuty)
## Overivew

This simple app.js script allows you to receive and acknowledge incidents on your Pebble Watch. 
This project uses [Pebble.js](https://github.com/pebble/pebblejs) and 
inspired by the article [Using Pebble.js to hit PagerDuty](http://euri.ca/2014/using-pebble-js-to-hit-pagerduty/).

The easiest way to use it: create a Pebble application with [Cloudpebble](https://cloudpebble.net/) and copy app.js content to app.js file in your project. More advanced way is to build app using [PebbleSDK](https://developer.pebble.com/sdk/install/).

## What this application allows you to do
- Receive incidents and view them as cards on your Pebble Watch
- Acknowledge an incident when you received it
- Acknowledge all incidents
- App will show you how long you are going to be on-call and how many open incidents you have

## Configuration

For a configuration page source code, please refer to [gh-pages branch](https://github.com/murat1985/pebblejs-pagerduty/tree/gh-pages) of this repository.

Before using you should configure Pebble.js Duty application from Pebble phone app:
- You require your pagerduty user-id - (e.g. PXYZ01)
- Subdomain (subdoman.pagerduty.com)
- API token - PagerDuty api key [Integration API] (https://developer.pagerduty.com/documentation/integration/events)
- Your email or part of your email that will identify you (e.g. usernam@invalid.tld - username )

## Buttons
- Up acknowledge incidents 
- Down fetch incidents that are assigned to you
