'use strict';

//
// Customize the behaviour of the CRUD app.
//

angular.module('customize', ['ng-admin'])

.controller("CustomActionCtrl", function ($scope) {
	$scope.customAction = function () {
		alert("Custom action...");
	};
})

.config(function (NgAdminConfigurationProvider) {

	var nga = NgAdminConfigurationProvider;

    var customer = nga.entity('customers')
    	.identifier(nga.field('_id'))
    	;

    customer.listView()
    	.perPage(20)
    	.infinitePagination(false) 
    	.batchActions(['delete'])
    	.listActions(['edit', 'delete'])
    	.sortField('_id')
    	.sortDir('DESC')
    	.filters([
    		nga.field('_id')
				.label("ID")
				,
			nga.field("name")
				.label("Name")
				,
		    nga.field("email")
				.label("Email")
				,
		    nga.field("gender")
				.label("Gender")
				,
		])
    	.fields([
		    nga.field('_id')
				.label("ID")
		    	.isDetailLink(true)
		    	,
			nga.field("name")
				.label("Name")
				,
		    nga.field("email")
				.label("Email")
				,
		    nga.field("gender")
				.label("Gender")
				,
		]);

	customer.creationView()
		.fields([
			nga.field("name")
				.label("Name")
				.validation({ required: true })
				,
		    nga.field("email")
				.label("Email")
				.validation({ required: true })
				,
		    nga.field("gender", 'choice')
				.label("Gender")
				.validation({ required: true })
				.choices([
					{ label: 'Male', value: 'Male' },
					{ label: 'Female', value: 'Female' },
				])
				,
		]);

	customer.editionView()
		.title("Edit customer {{entry.values.Name}}")
		.actions(['list', 'delete'])
		.fields(customer.creationView().fields())
		;    

    var sales = nga.entity('sales').identifier(nga.field('_id'));

    sales.listView()
    	.perPage(20)
    	.infinitePagination(false)
    	.batchActions(['delete'])
    	.listActions(['edit', 'delete'])
    	.sortField('_id')
    	.sortDir('DESC')
    	.fields([
		    nga.field('_id')
		    	.label('ID')
		    	.isDetailLink(true)
		    	,
		    nga.field('customer', 'reference')
	            .targetEntity(customer)
	            .targetField(nga.field('_id'))
		    	.label('Customer')
	            ,
		    nga.field('product')
		    	.label('Product')
		    	,
		    nga.field('date', 'datetime')
		    	.label('Date')
		    	,
		]);

	sales.creationView()
		.title("Create sales record.")
		.actions(['list', 'delete'])
		.fields([
		    nga.field('_id')
		    	.label('ID')
		    	,
		    nga.field('customer') //, 'reference') todo: Reference doesn't seem to work.
	            //.targetEntity(customer)
	            //.targetField(nga.field('_id'))
		    	.label('Customer')
		    	.validation({ required: true })
	            ,
		    nga.field('product')
		    	.label('Product')
		    	.validation({ required: true })
		    	,
		    nga.field('date', 'datetime')
		    	.label('Date')
		    	.validation({ required: true })
		    	,
		])
		;    

	sales.editionView()
		.title("Edit sales record {{entry.values.Name}}")
		.actions(['list', 'delete'])
		.fields(sales.creationView().fields())
		;

	var baseUrlPrefix = location.protocol + '//' + location.hostname + (location.port ? ':' + location.port : '') + location.pathname;
	var endPointPrefix = 'api/v1/'
	var baseUrl = baseUrlPrefix + endPointPrefix;
	console.log('Using base URL ' + baseUrl);

	var menu = nga.menu()
		.addChild(nga.menu(customer))
		.addChild(nga.menu(sales))
		.addChild(nga.menu()
			.title('Tools')
			.addChild(nga.menu()
		        .title('Custom page')
		        .link('/custom-page')
		        .active(function (path) {
		            return path.indexOf('/custom-page') === 0;
		        })
		        .icon('<span class="glyphicon glyphicon-file"></span>')
	    	)
			.addChild(nga.menu()
		        .title('Custom Action')	    	
		        .template(
		        	'<a ng-controller="CustomActionCtrl" ng-click="customAction()"><span class="glyphicon glyphicon-file"></span> Custom action</a>'
	        	)
		    )
	    )
	    ;

	var dashboard = nga.dashboard()
		.addCollection(
			nga.collection(sales)
				.name('recent_sales')
				.title('Recent Sales')
				.perPage(10)
				.fields([
				    nga.field('_id')
				    	.label('ID')
				    	.isDetailLink(true)
				    	,
				    nga.field('customer', 'reference')
			            .targetEntity(customer)
			            .targetField(nga.field('_id'))
				    	.label('Customer')
				    	,
				    nga.field('date', 'datetime')
				    	.label('Date')
				    	,
				])
				.sortField('date')
        		.sortDir('ASC')
        		.order(1)
		);

    var admin = nga.application()
    	.title('Template Admin Portal')
		.baseApiUrl(baseUrl)
		.menu(menu)
		.dashboard(dashboard)
  		;

    admin.addEntity(customer);
    admin.addEntity(sales);
    nga.configure(admin);    	
});
