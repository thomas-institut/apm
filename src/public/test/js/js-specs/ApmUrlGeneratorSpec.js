/* 
 *  Copyright (C) 2019 Universität zu Köln
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

/* global expect*/

describe("ApmUrlGenerator", function() {
  
  describe("Generator functions", function (){
    it("should generate urls", function (){
      let baseUrl = 'myBase'
      let ug = new ApmUrlGenerator(baseUrl)
      
      let matchRE = '^' + baseUrl + '/.*'
      expect(ug.apiQuickCollation()).toMatch(matchRE)
      expect(ug.apiAutomaticCollation()).toMatch(matchRE)
      expect(ug.apiGetPresets()).toMatch(matchRE)
      expect(ug.apiPostPresets()).toMatch(matchRE)
      expect(ug.apiDeletePreset(1)).toMatch(matchRE)
      expect(ug.apiGetAutomaticCollationPresets()).toMatch(matchRE)
      expect(ug.siteCollationTable('work', 1, 'la')).toMatch(matchRE)
      expect(ug.siteCollationTable('work', 1, 'la', [1, 2])).toMatch(matchRE)
      expect(ug.siteCollationTableCustom('work', 1, 'la')).toMatch(matchRE)
      expect(ug.siteCollationTablePreset('work', 1, 123)).toMatch(matchRE)
      expect(ug.sitePageView('work', 1)).toMatch(matchRE)
      // expect(ug.siteWitness('work', 1, 'doc', 1)).toMatch(matchRE)


    })
  })
  
})
  