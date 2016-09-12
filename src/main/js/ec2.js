#!/usr/bin/env node

var jsonQuery = require('json-query');
var aws = require('aws-sdk');
var test = require('unit.js');
var _ = require('underscore');
var flatMap = require('flatmap');
var Promise = require("bluebird");

describe('EC2 instances', function () {
    var ec2 = new aws.EC2({region: "eu-west-1"});
    var iam = new aws.IAM({region: "eu-west-1"});
    var instances = [];

    before(function (done) {
        this.timeout(6000);
        aws.config.setPromisesDependency(require('bluebird'));

        var params = {
            Filters: [
                {
                    Name: 'instance-state-name',
                    Values: ['running', 'pending', 'stopping', 'stopped']
                }
            ]
        };

        ec2.describeInstances(params).promise().then(
            function (value) {
                value["Reservations"].forEach(function (reservation) {
                    instances = instances.concat(reservation["Instances"]);
                });
                done();
            },
            function (error) {
                console.log(error)
            }
        );
    });

    it("should live inside a vpc", function () {
        instances.forEach(function (instance) {
            var id = jsonQuery('InstanceId', {data: instance})["value"];
            var vpcId = jsonQuery('VpcId', {data: instance})["value"];

            test.assert(vpcId, "The instance " + id + " should be inside a VPC but seems to be EC2 classic")
        });
    });

    it("should not be widely open to the world", function () {
        var securityGroupIds = flatMap(instances
            .map(function (instance) {
                return instance["SecurityGroups"];
            }), function (item) {
            return item
        })
            .map(function (securityGroup) {
                return securityGroup["GroupId"]
            });

        return ec2.describeSecurityGroups({
            GroupIds: _.uniq(securityGroupIds)
        }).promise().then(function (value) {
            value["SecurityGroups"].forEach(function (securityGroup) {
                //console.log(jsonQuery('IpPermissions[].IpRanges[].CidrIp', {data: securityGroup})["value"]);
                ipRange = jsonQuery('IpPermissions[].IpRanges[].CidrIp', {data: securityGroup})["value"];
                test.assert((!ipRange || !ipRange.startsWith("0.0.0.0")), "Instances should not be world reachable")
            });
        });
    });

    it("should not have wide iAM permissions", function () {
        var instanceProfiles = instances
            .map(function (instance) {
                //console.log(jsonQuery('IamInstanceProfile.Arn', {data: instance})["value"]);
                return jsonQuery('IamInstanceProfile.Arn', {data: instance})["value"]
            })
            .map(function (profileArn) {
                return iam.getInstanceProfile({InstanceProfileName: profileArn.split("/")[1]}).promise()
            });

        Promise.map(instanceProfiles, function (instanceProfile) {
            return jsonQuery('InstanceProfile.Roles[].RoleName', {data: instanceProfile})["value"]
        }).then(function (v) {
            //console.log(v)
        })
    });

    it("should not have wide iAM permissions2", function () {


        instances
            .map(function (instance) {
                return jsonQuery('IamInstanceProfile.Arn', {data: instance})["value"]
            })
            .map(function (profileArn) {

                iam.getInstanceProfile({InstanceProfileName: profileArn.split("/")[1]}).promise()
                    .then(function (instanceProfile) {
                        return jsonQuery('InstanceProfile.Roles[].RoleName', {data: instanceProfile})["value"]
                    })
                    .then(function (roleName) {
                        //console.log("#" + roleName + "#")
                        return iam.listRolePolicies({RoleName: roleName}).promise().then(function (policies) {
                            return {roleName: roleName, rolePolicies: policies}
                        })
                    })
                    .then(function (rolePolicies) {
                        console.log(rolePolicies);
                        return jsonQuery('PolicyNames', {data: rolePolicies})["value"]
                    }).then(function (rolePolicyName) {
                    //console.log(rolePolicyName)
                })
            });

    });
});
