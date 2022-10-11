import spacy_udpipe
import sys

# Get phrase from php exec-command
phrase = sys.argv[1:]
phrase = " ".join(phrase)

# Tokenize and lemmatize
nlp = spacy_udpipe.load("ar")
annotations = nlp(phrase)
tokens = [token.text for token in annotations]
lemmata = [token.lemma_ for token in annotations]

# Print output to work with it in PHP
print('#'.join(tokens))
print('#'.join(lemmata))

# OLDER CODE USING QALSADI
""" 
import qalsadi.lemmatizer
import sys

# Get phrase from php exec-command
phrase = sys.argv[1:]
phrase = " ".join(phrase)

# Get tokens
tokens = phrase.split(" ")

# Get lemmata
lemmatizer = qalsadi.lemmatizer.Lemmatizer()
lemmata = [lemmatizer.lemmatize(t) for t in tokens]

# Encode and print tokens and lemmata to work with them in php
print('#'.join(tokens))
print('#'.join(lemmata))
"""
