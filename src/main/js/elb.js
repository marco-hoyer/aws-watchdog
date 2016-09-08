#!/usr/bin/env node

var jsonQuery = require('json-query');
var aws = require('aws-sdk');
var test = require('unit.js');


describe('ElasticLoadbalancers', function () {
    var loadbalancers = [];

    before(function (done) {
        this.timeout(6000);
        aws.config.setPromisesDependency(require('bluebird'));
        var elb = new aws.ELB({region: "eu-west-1"});

        elb.describeLoadBalancers().promise().then(
            function (value) {
                //console.log(value);
                loadbalancers = value["LoadBalancerDescriptions"];
                done();
            },
            function (error) {
                console.log(error)
            }
        );
    });

    it("should have a healthcheck configured", function () {
        loadbalancers.forEach(function (elb) {
            //console.log(elb);
            var name = jsonQuery('LoadBalancerName', {data: elb})["value"];
            var healthCheckTarget = jsonQuery('HealthCheck.Target', {data: elb})["value"];
            test.assert(healthCheckTarget, "The ELB " + name + " should have a HealthCheck configured")
        });
    });
});
// console.log(jsonQuery('people[country=NZ].name', {data: data}));

