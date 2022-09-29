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



