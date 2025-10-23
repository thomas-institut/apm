import {describe, expect, it} from 'vitest';
import {ApmUtil} from '@/ApmUtil';


describe("ApmUtil", function () {

  describe("API to JS glue code", function () {
    it("should convert languages array to langDef object", function () {
      let emptyLangArray: string[] = [];
      expect(ApmUtil.getLangDefFromLanguagesArray(emptyLangArray)).toEqual({});

      let langArray1 = [{code: 'ar', name: 'Arabic', rtl: true, fontsize: 3}, {
        code: 'la',
        name: 'Latin',
        rtl: false,
        fontsize: 3
      }];
      let langDef1 = ApmUtil.getLangDefFromLanguagesArray(langArray1);
      expect(langDef1.ar).toBeDefined();
      expect(langDef1.ar).toEqual(langArray1[0]);
      expect(langDef1.la).toBeDefined();
      expect(langDef1.la).toEqual(langArray1[1]);

    });
  });

});
