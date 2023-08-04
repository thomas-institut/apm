/*
 * SplitGrid, modified version of the split-grid NPM Package
 *
 * split-grid is Copyright (c) 2020 Nathan Cahill
 *
 * - Added multiple window support
 * - Refactored to ES6 module syntax
 */


/*
Copyright (c) 2020 Nathan Cahill

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
 */


const gridTemplatePropColumns = 'grid-template-columns';
const gridTemplatePropRows = 'grid-template-rows';


export class SplitGrid {
  constructor (options) {

    this.columnGutters = {};
    this.rowGutters = {};
    this.window = options.window

    this.options = Object.assign({}, {columnGutters: options.columnGutters || [],
        rowGutters: options.rowGutters || [],
        columnMinSizes: options.columnMinSizes || {},
        rowMinSizes: options.rowMinSizes || {},
        window: options.window || window
      },
      options);

    this.options.columnGutters.forEach( (gutterOptions) => {
      gutterOptions.window = this.window
      this.columnGutters[gutterOptions.track] = genGutterCreator(
        'column',
        this.options
      )(gutterOptions);
    });

    this.options.rowGutters.forEach( (gutterOptions) => {
      gutterOptions.window = this.window
      this.rowGutters[gutterOptions.track] = genGutterCreator(
        'row',
        this.options
      )(gutterOptions);
    });
  }

  addColumnGutter (element, track) {
    if (this.columnGutters[track]) {
      this.columnGutters[track].destroy();
    }

    this.columnGutters[track] = genGutterCreator(
      'column',
      this.options
    )({
      element: element,
      track: track,
    });
  }

  addRowGutter (element, track) {
    if (this.rowGutters[track]) {
      this.rowGutters[track].destroy();
    }

    this.rowGutters[track] = genGutterCreator(
      'row',
      this.options
    )({
      element: element,
      track: track,
    });
  };

  removeColumnGutter (track, immediate) {
    if ( immediate === void 0 ) immediate = true;

    if (this.columnGutters[track]) {
      this.columnGutters[track].destroy(immediate,  ()=> {
        delete this.columnGutters[track];
      })
    }
  };

  removeRowGutter (track, immediate) {
    if ( immediate === void 0 ) immediate = true;

    if (this.rowGutters[track]) {
      this.rowGutters[track].destroy(immediate,  ()=> {
        delete this.rowGutters[track];
      })
    }
  };

  handleDragStart (e, direction, track) {
    if (direction === 'column') {
      if (this.columnGutters[track]) {
        this.columnGutters[track].destroy();
      }

      this.columnGutters[track] = genGutterCreator(
        'column',
        this.options
      )({
        track: track,
      });
      this.columnGutters[track].startDragging(e);
    } else if (direction === 'row') {
      if (this.rowGutters[track]) {
        this.rowGutters[track].destroy();
      }

      this.rowGutters[track] = genGutterCreator(
        'row',
        this.options
      )({
        track: track,
      });
      this.rowGutters[track].startDragging(e);
    }
  };

  destroy (immediate) {
    if ( immediate === void 0 ) immediate = true;

    Object.keys(this.columnGutters).forEach( (track) => {
      return this.columnGutters[track].destroy(immediate,  () => {
        delete this.columnGutters[track];
      })
    })
    Object.keys(this.rowGutters).forEach( (track) => { return this.rowGutters[track].destroy(immediate,  () => {
        delete this.rowGutters[track];
      })
    })
  }
}


class Gutter {
  constructor (direction, options, parentOptions) {
    this.direction = direction;
    this.element = options.element;
    this.track = options.track;
    this.window = options.window

    if (direction === 'column') {
      this.gridTemplateProp = gridTemplatePropColumns;
      this.gridGapProp = 'grid-column-gap';
      this.cursor = getOption(
        parentOptions,
        'columnCursor',
        getOption(parentOptions, 'cursor', 'col-resize')
      );
      this.snapOffset = getOption(
        parentOptions,
        'columnSnapOffset',
        getOption(parentOptions, 'snapOffset', 30)
      );
      this.dragInterval = getOption(
        parentOptions,
        'columnDragInterval',
        getOption(parentOptions, 'dragInterval', 1)
      );
      this.clientAxis = 'clientX';
      this.optionStyle = getOption(parentOptions, 'gridTemplateColumns', {});
    } else if (direction === 'row') {
      this.gridTemplateProp = gridTemplatePropRows;
      this.gridGapProp = 'grid-row-gap';
      this.cursor = getOption(
        parentOptions,
        'rowCursor',
        getOption(parentOptions, 'cursor', 'row-resize')
      );
      this.snapOffset = getOption(
        parentOptions,
        'rowSnapOffset',
        getOption(parentOptions, 'snapOffset', 30)
      );
      this.dragInterval = getOption(
        parentOptions,
        'rowDragInterval',
        getOption(parentOptions, 'dragInterval', 1)
      );
      this.clientAxis = 'clientY';
      this.optionStyle = getOption(parentOptions, 'gridTemplateRows', {});
    }

    this.onDragStart = getOption(parentOptions, 'onDragStart', NullFunction);
    this.onDragEnd = getOption(parentOptions, 'onDragEnd', NullFunction);
    this.onDrag = getOption(parentOptions, 'onDrag', NullFunction);
    this.writeStyle = getOption(
      parentOptions,
      'writeStyle',
      defaultWriteStyleFunction
    );

    this.startDragging = this.startDragging.bind(this);
    this.stopDragging = this.stopDragging.bind(this);
    this.drag = this.drag.bind(this);

    this.minSizeStart = options.minSizeStart;
    this.minSizeEnd = options.minSizeEnd;

    if (options.element) {
      this.element.addEventListener('mousedown', this.startDragging);
      this.element.addEventListener('touchstart', this.startDragging);
    }
  }

  getDimensions () {
    const ref = this.grid.getBoundingClientRect()
    const width = ref.width
    const height = ref.height
    const top = ref.top
    const bottom = ref.bottom
    const left = ref.left
    const right = ref.right

    if (this.direction === 'column') {
      this.start = top;
      this.end = bottom;
      this.size = height;
    } else if (this.direction === 'row') {
      this.start = left;
      this.end = right;
      this.size = width;
    }
  }

  getSizeAtTrack(track, end) {
    return getSizeAtTrack(
      track,
      this.computedPixels,
      this.computedGapPixels,
      end
    )
  }

  getSizeOfTrack (track) {
    return this.computedPixels[track].numeric
  }

  getRawTracks () {
    let tracks = getStyles(
      this.gridTemplateProp,
      [this.grid],
      getMatchedCSSRules(this.grid)
    )
    if (!tracks.length) {
      if (this.optionStyle) { return this.optionStyle }

      throw Error('Unable to determine grid template tracks from styles.')
    }
    return tracks[0]
  }

  getGap () {
    let gap = getStyles(
      this.gridGapProp,
      [this.grid],
      getMatchedCSSRules(this.grid)
    );
    if (!gap.length) {
      return null
    }
    return gap[0]
  }

  getRawComputedTracks () {
    return this.window.getComputedStyle(this.grid)[this.gridTemplateProp]
  }

  getRawComputedGap () {
    return this.window.getComputedStyle(this.grid)[this.gridGapProp]
  }

  setTracks (raw) {
    this.tracks = raw.split(' ');
    this.trackValues = parse(raw);
  }

  setComputedTracks (raw) {
    this.computedTracks = raw.split(' ');
    this.computedPixels = parse(raw);
  }

  setGap (raw) {
    this.gap = raw;
  }

  setComputedGap (raw) {
    this.computedGap = raw;
    this.computedGapPixels = getGapValue('px', this.computedGap) || 0;
  }

  getMousePosition (e) {
    if ('touches' in e) { return e.touches[0][this.clientAxis] }
    return e[this.clientAxis]
  }

  startDragging (e) {
    if ('button' in e && e.button !== 0) {
      return
    }

    // Don't actually drag the element. We emulate that in the drag function.
    e.preventDefault();

    if (this.element) {
      this.grid = this.element.parentNode;
    } else {
      this.grid = e.target.parentNode;
    }

    this.getDimensions();
    this.setTracks(this.getRawTracks());
    this.setComputedTracks(this.getRawComputedTracks());
    this.setGap(this.getGap());
    this.setComputedGap(this.getRawComputedGap());

    let trackPercentage = this.trackValues.filter(
      function (track) { return track.type === '%'; }
    );
    let trackFr = this.trackValues.filter(function (track) { return track.type === 'fr'; });

    this.totalFrs = trackFr.length;

    if (this.totalFrs) {
      let track = firstNonZero(trackFr);

      if (track !== null) {
        this.frToPixels =
          this.computedPixels[track].numeric / trackFr[track].numeric;
      }
    }

    if (trackPercentage.length) {
      let track$1 = firstNonZero(trackPercentage);

      if (track$1 !== null) {
        this.percentageToPixels =
          this.computedPixels[track$1].numeric /
          trackPercentage[track$1].numeric;
      }
    }

    // get start of gutter track
    let gutterStart = this.getSizeAtTrack(this.track, false) + this.start;
    this.dragStartOffset = this.getMousePosition(e) - gutterStart;

    this.aTrack = this.track - 1;

    if (this.track < this.tracks.length - 1) {
      this.bTrack = this.track + 1;
    } else {
      throw Error(
        ("Invalid track index: " + (this.track) + ". Track must be between two other tracks and only " + (this.tracks.length) + " tracks were found.")
      )
    }

    this.aTrackStart = this.getSizeAtTrack(this.aTrack, false) + this.start;
    this.bTrackEnd = this.getSizeAtTrack(this.bTrack, true) + this.start;

    // Set the dragging property of the pair object.
    this.dragging = true;

    // All the binding. `window` gets the stop events in case we drag out of the elements.
    this.window.addEventListener('mouseup', this.stopDragging);
    this.window.addEventListener('touchend', this.stopDragging);
    this.window.addEventListener('touchcancel', this.stopDragging);
    this.window.addEventListener('mousemove', this.drag);
    this.window.addEventListener('touchmove', this.drag);

    // Disable selection. Disable!
    this.grid.addEventListener('selectstart', NullFunction);
    this.grid.addEventListener('dragstart', NullFunction);

    this.grid.style.userSelect = 'none';
    this.grid.style.webkitUserSelect = 'none';
    this.grid.style.MozUserSelect = 'none';
    this.grid.style.pointerEvents = 'none';

    // Set the cursor at multiple levels
    this.grid.style.cursor = this.cursor;
    this.window.document.body.style.cursor = this.cursor;

    this.onDragStart(this.direction, this.track);
  }

  stopDragging () {
    this.dragging = false;

    // Remove the stored event listeners. This is why we store them.
    this.cleanup();

    this.onDragEnd(this.direction, this.track);

    if (this.needsDestroy) {
      if (this.element) {
        this.element.removeEventListener(
          'mousedown',
          this.startDragging
        );
        this.element.removeEventListener(
          'touchstart',
          this.startDragging
        );
      }
      this.destroyCb();
      this.needsDestroy = false;
      this.destroyCb = null;
    }
  }

  drag (e) {
    let mousePosition = this.getMousePosition(e);

    let gutterSize = this.getSizeOfTrack(this.track);
    let minMousePosition =
      this.aTrackStart +
      this.minSizeStart +
      this.dragStartOffset +
      this.computedGapPixels;
    let maxMousePosition =
      this.bTrackEnd -
      this.minSizeEnd -
      this.computedGapPixels -
      (gutterSize - this.dragStartOffset);
    let minMousePositionOffset = minMousePosition + this.snapOffset;
    let maxMousePositionOffset = maxMousePosition - this.snapOffset;

    if (mousePosition < minMousePositionOffset) {
      mousePosition = minMousePosition;
    }

    if (mousePosition > maxMousePositionOffset) {
      mousePosition = maxMousePosition;
    }

    if (mousePosition < minMousePosition) {
      mousePosition = minMousePosition;
    } else if (mousePosition > maxMousePosition) {
      mousePosition = maxMousePosition;
    }

    let aTrackSize =
      mousePosition -
      this.aTrackStart -
      this.dragStartOffset -
      this.computedGapPixels;
    let bTrackSize =
      this.bTrackEnd -
      mousePosition +
      this.dragStartOffset -
      gutterSize -
      this.computedGapPixels;

    if (this.dragInterval > 1) {
      let aTrackSizeIntervaled =
        Math.round(aTrackSize / this.dragInterval) * this.dragInterval;
      bTrackSize -= aTrackSizeIntervaled - aTrackSize;
      aTrackSize = aTrackSizeIntervaled;
    }

    if (aTrackSize < this.minSizeStart) {
      aTrackSize = this.minSizeStart;
    }

    if (bTrackSize < this.minSizeEnd) {
      bTrackSize = this.minSizeEnd;
    }

    if (this.trackValues[this.aTrack].type === 'px') {
      this.tracks[this.aTrack] = aTrackSize + "px";
    } else if (this.trackValues[this.aTrack].type === 'fr') {
      if (this.totalFrs === 1) {
        this.tracks[this.aTrack] = '1fr';
      } else {
        let targetFr = aTrackSize / this.frToPixels;
        this.tracks[this.aTrack] = targetFr + "fr";
      }
    } else if (this.trackValues[this.aTrack].type === '%') {
      let targetPercentage = aTrackSize / this.percentageToPixels;
      this.tracks[this.aTrack] = targetPercentage + "%";
    }

    if (this.trackValues[this.bTrack].type === 'px') {
      this.tracks[this.bTrack] = bTrackSize + "px";
    } else if (this.trackValues[this.bTrack].type === 'fr') {
      if (this.totalFrs === 1) {
        this.tracks[this.bTrack] = '1fr';
      } else {
        let targetFr$1 = bTrackSize / this.frToPixels;
        this.tracks[this.bTrack] = targetFr$1 + "fr";
      }
    } else if (this.trackValues[this.bTrack].type === '%') {
      let targetPercentage$1 = bTrackSize / this.percentageToPixels;
      this.tracks[this.bTrack] = targetPercentage$1 + "%";
    }

    let style = this.tracks.join(' ');
    this.writeStyle(this.grid, this.gridTemplateProp, style);
    this.onDrag(this.direction, this.track, style);
  }
  cleanup () {
    this.window.removeEventListener('mouseup', this.stopDragging);
    this.window.removeEventListener('touchend', this.stopDragging);
    this.window.removeEventListener('touchcancel', this.stopDragging);
    this.window.removeEventListener('mousemove', this.drag);
    this.window.removeEventListener('touchmove', this.drag);

    if (this.grid) {
      this.grid.removeEventListener('selectstart', NullFunction);
      this.grid.removeEventListener('dragstart', NullFunction);

      this.grid.style.userSelect = '';
      this.grid.style.webkitUserSelect = '';
      this.grid.style.MozUserSelect = '';
      this.grid.style.pointerEvents = '';

      this.grid.style.cursor = '';
    }

    this.window.document.body.style.cursor = '';
  };

  destroy (immediate, cb) {
    if ( immediate === void 0 ) immediate = true;

    if (immediate || this.dragging === false) {
      this.cleanup();
      if (this.element) {
        this.element.removeEventListener(
          'mousedown',
          this.startDragging
        );
        this.element.removeEventListener(
          'touchstart',
          this.startDragging
        );
      }

      if (cb) {
        cb();
      }
    } else {
      this.needsDestroy = true;
      if (cb) {
        this.destroyCb = cb;
      }
    }
  }

}


function genGutterCreator(direction, options) {
  return function (gutterOptions) {
  if (gutterOptions.track < 1) {
    throw Error(
      ("Invalid track index: " + (gutterOptions.track) + ". Track must be between two other tracks.")
    )
  }

  let trackMinSizes =
    direction === 'column'
      ? options.columnMinSizes || {}
      : options.rowMinSizes || {};
  let trackMinSize = direction === 'column' ? 'columnMinSize' : 'rowMinSize';

  return new Gutter(
    direction,
    Object.assign({}, {minSizeStart: getTrackOption(
          trackMinSizes,
          gutterOptions.track - 1,
          getOption(
            options,
            trackMinSize,
            getOption(options, 'minSize', 0)
          )
        ),
        minSizeEnd: getTrackOption(
          trackMinSizes,
          gutterOptions.track + 1,
          getOption(
            options,
            trackMinSize,
            getOption(options, 'minSize', 0)
          )
        )},
      gutterOptions),
    options
  )
}
}

function getTrackOption (options, track, defaultValue) {
  if (track in options) {
    return options[track]
  }

  return defaultValue
}
function numeric (value, unit) {
  return Number(value.slice(0, -1 * unit.length))
}
function parseValue (value) {
  if (value.endsWith('px'))
  { return { value: value, type: 'px', numeric: numeric(value, 'px') } }
  if (value.endsWith('fr'))
  { return { value: value, type: 'fr', numeric: numeric(value, 'fr') } }
  if (value.endsWith('%'))
  { return { value: value, type: '%', numeric: numeric(value, '%') } }
  if (value === 'auto') { return { value: value, type: 'auto' } }
  return null
}
function parse (rule) {
  return rule.split(' ').map(parseValue);
}
function getSizeAtTrack(index, tracks, gap, end) {
  if ( gap === void 0 ) { gap = 0; }
  if ( end === void 0 ) { end = false; }

  let newIndex = end ? index + 1 : index;
  let trackSum = tracks
    .slice(0, newIndex)
    .reduce(function (accum, value) { return accum + value.numeric; }, 0);
  let gapSum = gap ? index * gap : 0;

  return trackSum + gapSum
}
function getStyles (rule, ownRules, matchedRules) {
  return ownRules.concat( matchedRules)
    .map(function (r) { return r.style[rule]; })
    .filter(function (style) { return style !== undefined && style !== ''; });
}
function getGapValue(unit, size) {
  if (size.endsWith(unit)) {
    return Number(size.slice(0, -1 * unit.length))
  }
  return null
}
function firstNonZero(tracks) {
  // eslint-disable-next-line no-plusplus
  for (let i = 0; i < tracks.length; i++) {
    if (tracks[i].numeric > 0) {
      return i
    }
  }
  return null
}
function NullFunction() {
  return false
}
function defaultWriteStyleFunction(element, gridTemplateProp, style) {
  // eslint-disable-next-line no-param-reassign
  element.style[gridTemplateProp] = style;
}

/**
 * Returns an option value if defined in the given options objects, otherwise returns the given default value
 * @param {{}}options
 * @param {string}optionName
 * @param {any}defaultValue
 * @return {any}
 */
function getOption(options, optionName, defaultValue) {
  let value = options[optionName];
  if (value !== undefined) {
    return value
  }
  return defaultValue
}
function getMatchedCSSRules (el) {
  let ref;

  return (ref = [])
    .concat.apply(
      ref, Array.from(el.ownerDocument.styleSheets).map(function (s) {
        let rules = [];

        try {
          rules = Array.from(s.cssRules || []);
        } catch (e) {
          // Ignore results on security error
        }

        return rules
      })
    )
    .filter(function (r) {
      let matches = false;
      try {
        matches = el.matches(r.selectorText);
      } catch (e) {
        // Ignore matching errors
      }

      return matches
    });
}