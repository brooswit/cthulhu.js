const EventEmitter = require('events')
const {TaskManager, MethodRegistry} = require('brooswit-common')
const WebhookIngester = require('./src/components/WebhookIngester')
const SlackIntegration = require('./src/components/SlackIntegration')
const SalesforceIntegration = require('./src/components/SalesforceIntegration')
const ClubhouseIntegration = require('./src/components/ClubhouseIntegration')
const ZendeskIntegration = require('./src/components/ZendeskIntegration')

class Cthulhu {
    constructor() {
        this.events = new EventEmitter()
        this.operations = new MethodRegistry()
        this.tasks = new TaskManager()
        console.warn("...Cthulhu is ready...")
    }
}

Cthulhu.WebhookIngester = WebhookIngester
Cthulhu.SlackIntegration = SlackIntegration
Cthulhu.SalesforceIntegration = SalesforceIntegration
Cthulhu.ClubhouseIntegration = ClubhouseIntegration
Cthulhu.ZendeskIntegration = ZendeskIntegration

module.exports = Cthulhu
