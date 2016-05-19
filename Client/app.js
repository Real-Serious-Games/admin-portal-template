'use strict';

//
// Define the 'app' module.
//
angular.module('app', ['ng-admin', 'customize'])

.config(['RestangularProvider', function(RestangularProvider) {
    RestangularProvider.addFullRequestInterceptor(function(element, operation, what, url, headers, params, httpConfig) {
    	console.log('Request');
    	console.log(url);
        return { element: element };
    });
}])

//
// Application controller.
//
.controller('AppCtrl', function AppCtrl ($scope) {

	
})

;