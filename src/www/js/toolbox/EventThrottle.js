import { wait } from './FunctionUtil.mjs'


const STATE_STANDBY = 'standby'
const STATE_TICKING = 'ticking'
const STATE_HANDLING = 'handling'
const STATE_UNHANDLED_EVENT = 'unhandled_event'

const TICK_TIME = 10

export class EventThrottle {

  /**
   *
    * @param {function}handler
   * @param {string}context
   * @param {number}throttleTime
   */
  constructor (handler, context, throttleTime = 500) {
    this.handler = handler

    this.ticksToWaitBeforeFiring = Math.round(throttleTime / TICK_TIME)
    this.context = context
    this.eventsNotYetProcessed = 0
    this.unHandledEvents = 0
    this.state = STATE_STANDBY
    this.debug = false
    this.interval = null
    this.eventData = null
    this.unHandledEventData = null
  }

  __processTick() {
    switch(this.state) {
      case STATE_TICKING:
        this.ticksWithoutEvent++
        if (this.ticksWithoutEvent > this.ticksToWaitBeforeFiring) {
          // FIRE
          this.debug && console.log(`${this.context}: Handling ${this.eventsNotYetProcessed} events that occurred while ticking`)
          this.state = STATE_HANDLING
          this.handler(this.eventData)

          if (this.state === STATE_HANDLING) {
            // nothing happened while handling
            this.state = STATE_STANDBY
            this.unHandledEvents = 0
            this.eventsNotYetProcessed = 0
            this.debug && console.log(`${this.context}: All good, going to Standby`)
            clearInterval(this.interval)
          } else {
            this.debug && console.log(`${this.context}: State changed to '${this.state}' while handling, will deal in next tick`)
          }
        }
        break

      case STATE_UNHANDLED_EVENT:
        this.debug && console.log(`${this.context}: Handling ${this.unHandledEvents} events that occurred while handling others`)
        // need to fire again
        this.state = STATE_HANDLING
        this.handler(this.unHandledEventData)
        if (this.state === STATE_HANDLING) {
          // nothing happened while handling
          this.state = STATE_STANDBY
          this.unHandledEvents = 0
          this.debug && console.log(`${this.context}: All good, going to Standby`)
          clearInterval(this.interval)
        }
        break

      case STATE_STANDBY:
        this.debug && console.warn(`${this.context}: Ticking while in standby, it should not happen but it's not fatal`)
        clearInterval(this.interval)
        break

      default:
        console.error(`${this.context}: Unknown state ${this.state} while ticking`)
    }
  }

  getHandler() {
    return (ev) => {
      switch(this.state) {
        case STATE_STANDBY:
          this.ticksWithoutEvent = 0
          this.eventsNotYetProcessed = 1
          this.eventData = ev
          this.debug && console.log(`${this.context}: Event received while in standby, starting to tick, ${this.eventsNotYetProcessed} not yet handled`)
          this.state = STATE_TICKING
          this.interval = setInterval( () => { this.__processTick()}, TICK_TIME)
          return

        case STATE_TICKING:
          this.eventsNotYetProcessed++
          this.ticksWithoutEvent = 0
          this.eventData = ev
          this.debug && console.log(`${this.context}: Event while ticking, ${this.eventsNotYetProcessed} not yet handled`)
          return

        case STATE_HANDLING:
          this.debug && console.warn(`${this.context}: Got event while handling others,  ${this.unHandledEvents} unhandled events`)
          this.unHandledEvents++
          this.unHandledEventData = ev
          this.state = STATE_UNHANDLED_EVENT
          return
      }
    }
  }

}