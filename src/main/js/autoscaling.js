#!/usr/bin/env node

var jsonQuery = require('json-query');
var aws = require('aws-sdk');
var test = require('unit.js');
var Promise = require('promise');


describe('AutoScalingGroups', function () {
    var autoScalingGroups;

    before(function (done) {
        this.timeout(6000);

        var autoscaling = new aws.AutoScaling({region: "eu-west-1"});
        var loadbalancing = new aws.ELB({region: "eu-west-1"});

        autoscaling.describeAutoScalingGroups().promise().then(
            function (value) {
                autoScalingGroups = value["AutoScalingGroups"];
                done();
            },
            function (error) {
                console.log(error)
            }
        );
    });

    it("should use ELB healthCheckType if an ELB is configured", function () {
        autoScalingGroups.forEach(function (asg) {
            // console.log(asg);
            var name = jsonQuery('AutoScalingGroupName', {data: asg})["value"];
            var loadbalancers = jsonQuery('LoadBalancerNames', {data: asg})["value"];
            var healthCheckType = jsonQuery('HealthCheckType', {data: asg})["value"];

            if (loadbalancers && loadbalancers.length > 0) {
                test.assert(healthCheckType == "ELB");
            }
        });
    });
});
// console.log(jsonQuery('people[country=NZ].name', {data: data}));

