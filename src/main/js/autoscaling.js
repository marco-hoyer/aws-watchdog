#!/usr/bin/env node

var jsonQuery = require('json-query');
var aws = require('aws-sdk');
var test = require('unit.js');


describe('AutoScalingGroups', function () {
    var autoScalingGroups = [];

    before(function (done) {
        this.timeout(6000);
        aws.config.setPromisesDependency(require('bluebird'));
        var autoscaling = new aws.AutoScaling({region: "eu-west-1"});

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
                test.assert(healthCheckType == "ELB", "The HealthCheckType property of " + name + " should be configured to 'ELB'");
            }
        });
    });
});

