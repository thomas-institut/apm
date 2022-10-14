<?php

$searched_phrase = '\\u05dc\\u05d3\\u05e2\\u05ea';

exec("python3 /home/lukas/apm/src/python/Lemmatizer_Query.py $searched_phrase", $tokens_and_lemmata);

$tokens_queried = explode("#", $tokens_and_lemmata[0]);
$lemmata = explode("#", $tokens_and_lemmata[1]);

print_r ($tokens_queried);
print_r ($lemmata);