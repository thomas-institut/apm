<?php

/*
 *  Copyright (C) 2019-2023 Universität zu Köln
 *
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see <https://www.gnu.org/licenses/>.
 *
 */

global $testConfig;

// Database configuration for unit test

$testConfig['db']['host'] = "localhost";
$testConfig['db']['user'] = "apmtest";
$testConfig['db']['pwd'] = "4pmt3st";
$testConfig['db']['db'] ="apmtest";

$testConfig['java_executable'] = '/usr/lib/jvm/java-8-openjdk-amd64/bin/java';