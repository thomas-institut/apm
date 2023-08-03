import simplemma
import spacy_udpipe
import qalsadi.lemmatizer
from langdetect import detect
import sys

# Get phrase from php exec-command
tokens = sys.argv[2:]
phrase = " ".join(tokens)

# Detect language
lang = sys.argv[1]
if lang == 'detect':
    lang = detect(phrase)

# Tokenization and lemmatization in three languages
if (lang=='he'):
    nlp = spacy_udpipe.load('he')
#     tokens = phrase.split(" ")
    lemmata = []
    for t in tokens:
        annotations = nlp(t)
        lemma = ''.join([token.lemma_ for token in annotations])
        lemmata.append(lemma)
elif (lang=='ar' or lang=='fa'):
    # lang='ar'
#     tokens = phrase.split(" ")
    lemmatizer = qalsadi.lemmatizer.Lemmatizer()
    lemmata = [lemmatizer.lemmatize(t) for t in tokens]
else:
    # lang='la'
    tokens = simplemma.simple_tokenizer(phrase)
    lemmata = [simplemma.lemmatize(t, lang=lang) for t in tokens]

# Encode and print tokens and lemmata to work with them in php
# print(lang)
print('#'.join(tokens))
print('#'.join(lemmata))