import simplemma
import spacy_udpipe
import qalsadi.lemmatizer
from langdetect import detect
import sys

# Get phrase from php exec-command
phrase = sys.argv[1:]
phrase = " ".join(phrase)

# Detect language
lang = detect(phrase)

# Tokenization and Lemmatization
if (lang=='he'):
    nlp = spacy_udpipe.load('he')
    annotations = nlp(phrase)
    tokens = [token.text for token in annotations]
    lemmata = [token.lemma_ for token in annotations]
elif (lang=='ar'):
    tokens = phrase.split(" ")
    lemmatizer = qalsadi.lemmatizer.Lemmatizer()
    lemmata = [lemmatizer.lemmatize(t) for t in tokens]
else:
    tokens = simplemma.simple_tokenizer(phrase)
    lemmata = [simplemma.lemmatize(t, lang='la') for t in tokens]

# Encode and print tokens and lemmata to work with them in php
print('#'.join(tokens))
print('#'.join(lemmata))