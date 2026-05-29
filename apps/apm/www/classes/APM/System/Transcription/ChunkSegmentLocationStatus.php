<?php

namespace APM\System\Transcription;

class ChunkSegmentLocationStatus
{
    const int UNDETERMINED = -1;
    const int VALID = 0;
    const int NO_CHUNK_START = 1;
    const int NO_CHUNK_END = 2;
    const int CHUNK_START_AFTER_END = 3;
    const int DUPLICATE_CHUNK_START_MARKS = 4;
    const int DUPLICATE_CHUNK_END_MARKS = 5;
}