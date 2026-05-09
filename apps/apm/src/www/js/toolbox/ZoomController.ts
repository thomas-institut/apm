/*
 *  Copyright (C) 2022 Universität zu Köln
 *
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see <https://www.gnu.org/licenses/>.
 *
 */

import { OptionsChecker } from '@thomas-inst/optionschecker'

/**
 * A Class to handle zoom controls
 */

const defaultIcons = {
  zoomIn: '<i class="bi bi-zoom-in"></i>',
  zoomOut: '<i class="bi bi-zoom-out"></i>',
}

const zoomSteps = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 2.75, 3, 3.25, 3.5, 3.75, 4, 5, 6, 7, 8]
const defaultZoomStep = 3


const zoomButtonClass = 'zoom-btn'
const zoomInButtonClass = 'zoom-in-btn'
const zoomOutButtonClass = 'zoom-out-btn'
const zoomLabelClass = 'zoom-label'

export class ZoomController {
  private readonly options: any;
  private readonly debug: boolean;
  private currentZoomStep: number;
  private currentScale: number;
  private container: JQuery<HTMLElement>;
  private zoomInButton: JQuery<HTMLElement>;
  private zoomOutButton: JQuery<HTMLElement>;
  private zoomLabel: JQuery<HTMLElement>;

  constructor (options: any) {
    let oc = new OptionsChecker({
      context: 'ZoomController',
      optionsDefinition: {
        containerSelector: { type: 'string', required: true},
        defaultZoomStep: { type: 'number', default: defaultZoomStep},
        icons: { type: 'object', default: defaultIcons},
        zoomSteps: { type: 'array', default: zoomSteps},
        onZoom: { type: 'function', default: (scale: number) => {
          return new Promise( (resolve) => {
            console.log(`Zooming to ${scale}`)
            resolve(scale)
          })
        }},
        debug: { type: 'boolean', default: false}
      }
    })

    this.options = oc.getCleanOptions(options)
    this.debug = this.options.debug
    this.debug && console.log(`Zoom Controller Options`)
    this.debug && console.log(this.options)
    this.currentZoomStep = this.options.defaultZoomStep
    this.currentScale = this.options.zoomSteps[this.currentZoomStep]
    this.container = $(this.options.containerSelector)
    this.container.html(this.getToolbarHtml())
    this.zoomInButton = this.getElement(zoomInButtonClass)
    this.zoomOutButton = this.getElement(zoomOutButtonClass)
    this.zoomLabel = this.getElement(zoomLabelClass)
    this.zoomInButton.on('click', this.genOnClickZoomButton(true))
    this.zoomOutButton.on('click', this.genOnClickZoomButton(false))
  }

  /**
   * Sets the zoom step to the closes value to the given scale
   * @param {number} scale
   * @param {boolean} sendEvent
   */
  public setZoomStepFromScale(scale: number, sendEvent: boolean = true) {
    console.log(`Setting step from scale ${scale}`)
    let scaledSteps = this.options.zoomSteps.map ( (step: number) => { return Math.abs(scale - step)});
    let bestFit = Math.min(...scaledSteps);
    console.log(`Best fit is ${bestFit}`);
    let newZoomStep = scaledSteps.indexOf(bestFit);
    console.log(`Changing zoom step to ${newZoomStep}`);
    this.setNewZoomStep(newZoomStep, sendEvent);
  }

  /**
   *
   * @param {number} newZoomStep
   * @param {boolean} sendEvent
   * @private
   */
  private setNewZoomStep(newZoomStep: number, sendEvent: boolean= true) {
    if (newZoomStep === zoomSteps.length) {
      // at the end of the scale, do nothing
      return
    }

    if (newZoomStep < 0) {
      return
      // at the other end of the scale, do nothing
    }

    let newScale = this.options.zoomSteps[newZoomStep]

    if (sendEvent) {
      this.options.onZoom(newScale).then( (scale: number) => {
        this.debug && console.log(`OnZoom finished, scale = ${scale}`)
        if (scale === newScale) {
          this.currentZoomStep = newZoomStep
          this.currentScale = newScale
          this.zoomLabel.html(this.getZoomScaleString(this.currentScale))
        }
      })
    } else {
      this.currentZoomStep = newZoomStep
      this.currentScale = newScale
      this.zoomLabel.html(this.getZoomScaleString(this.currentScale))
    }


  }

  private genOnClickZoomButton(zoomIn = true) {
    return () => {
      let newZoomStep
      if (zoomIn) {
        newZoomStep = this.currentZoomStep + 1
      } else {
        newZoomStep = this.currentZoomStep - 1
      }
      this.setNewZoomStep(newZoomStep);

    }
  }


  private getToolbarHtml() {
    return `Zoom: <span class="${zoomLabelClass}">${this.getZoomScaleString(this.currentScale)}</span>
        <button class="${zoomButtonClass} ${zoomOutButtonClass}" title="Zoom Out">${this.options.icons.zoomOut}</button> 
        <button class="${zoomButtonClass} ${zoomInButtonClass}" title="Zoom In">${this.options.icons.zoomIn}</button>`
  }

  private getZoomScaleString(scale: number) {
    return `${scale*100}%`
  }
  private getElement(elementClass: string): JQuery<HTMLElement> {
    return $(`${this.options.containerSelector} .${elementClass}`)
  }

}