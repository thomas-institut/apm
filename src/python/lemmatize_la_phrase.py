import simplemma
import sys

# Get phrase from php exec-command
phrase = sys.argv[1:]
phrase = " ".join(phrase)

# Get tokens and lemmata
tokens = simplemma.simple_tokenizer(phrase)
lemmata = [simplemma.lemmatize(t, lang='la') for t in tokens]

# Encode and print tokens and lemmata to work with them in php
print('#'.join(tokens))
print('#'.join(lemmata))

