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

# POSSIBLE ALTERNATIVE USING SPACY_STANZA
"""
import spacy_stanza

# Get phrase from php exec-command
#phrase = sys.argv[1:]
#phrase = " ".join(phrase)

phrase = "A quibusdam civibus irrisus tamen secundum naturam vivere studebat"

# Tokenize and lemmatize
nlp = spacy_stanza.load_pipeline("xx", lang="la")
annotations = nlp(phrase)
tokens = [token.text for token in annotations]
lemmata = [token.lemma_ for token in annotations]

# Print output to work with it in PHP
print('#'.join(tokens))
print('#'.join(lemmata))
"""

