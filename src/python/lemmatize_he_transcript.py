"""

LEMMATIZATION WITH SPARK NLP (Seems to work,but needs to much time)

from pyspark.ml import Pipeline
import sparknlp
from sparknlp.annotator import *
from sparknlp.base import DocumentAssembler, LightPipeline

spark = sparknlp.start()

document_assembler = DocumentAssembler()\
    .setInputCol("text")\
    .setOutputCol("document")

tokenizer = Tokenizer() \
    .setInputCols(["document"]) \
    .setOutputCol("token")

lemmatizer_he = LemmatizerModel.pretrained("lemma", "he") \
        .setInputCols(["token"]) \
        .setOutputCol("lemma")

pipeline_he = Pipeline(stages=[document_assembler, tokenizer, lemmatizer_he])

transcript = ["האריגה לעכביש. ובתים המשושי׳ לדבורים אלא שההבדל ביניהם הוא שהם מגיעות באדם במחשבה וההוצאה מהלב וזהו שנשלם בו בצלאל באמרו ולחשוב מחשבות ויוני מגיעות מהטבע ולכן לא ימצאו פעולתם במיני׳ שונים אבל ישיג "]

data_he = spark.createDataFrame([transcript]).toDF("text")
light_pipeline_he = LightPipeline(pipeline_he.fit(data_he))

result_he = light_pipeline_he.annotate(transcript)

tokens = [content['token'] for content in result_he]
lemmata = [content['lemma'] for content in result_he]


print(tokens)
print(lemmata)  
"""

import spacy_udpipe

# spacy_udpipe.download("he")

transcript="ולחשוב כי בדעת הוא מדבר. ולב שמעו יפותה מאמרו: ואם נמצא בנצח לשונו. במאמרים מפורסמים חברו. אשר יודו בני איש בם ויכיר. לחסרונם חכם לבב מהירו. ואם אין זה הֲדעת חק ומשפט שלימות זה ומותרו ואסרו. ואם נברא להתחכם ולעסוק. בדין ממון וקלו וחמורו. להבין איך יהיה משפט מריבים. עלי דבר ונזק שור ובורו. וקרבן שגגת איש או זדונו"
nlp = spacy_udpipe.load("he")

annotations = nlp(transcript)
tokens = [token.text for token in annotations]
lemmata = [token.lemma_ for token in annotations]

print(tokens)
print(lemmata)

if (len(tokens) == len(lemmata)):
    print ("Success!")
else:
    print ("Error!")
