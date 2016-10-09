/* 
 * Copyright (C) 2016 rafael
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; either version 2
 * of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA  02111-1307, USA.
 */
/**
 * Author:  rafael
 * Created: Oct 9, 2016
 */

/*
 * Some users
  */
INSERT INTO `ap_users` (`id`, `username`, `password`, `fullname`) VALUES 
    (21, 'john', NULL, 'John Lennon'),
    (22, 'paul', NULL, 'Paul McCartney'),
    (23, 'george', NULL, 'George Harrison'),
    (24, 'ringo', NULL, 'Ringo Starr');

/*
 * Fake manuscript 1
 */

INSERT INTO `ap_elements` (`id`, `type`, `doc_id`, `page_number`, `column_number`, `seq`, `line_number`, `editor_id`) VALUES
(100, 1, 'BEATLES-LOVE_ME_DO', 1, 1, 1, 1, 21), 
(101, 1, 'BEATLES-LOVE_ME_DO', 1, 1, 2, 2, 21), 
(102, 1, 'BEATLES-LOVE_ME_DO', 1, 1, 3, 3, 21), 
(103, 1, 'BEATLES-LOVE_ME_DO', 1, 1, 4, 4, 21), 
(104, 1, 'BEATLES-LOVE_ME_DO', 1, 1, 5, 5, 21),
(110, 1, 'BEATLES-LOVE_ME_DO', 5, 1, 1, 1, 22), 
(111, 1, 'BEATLES-LOVE_ME_DO', 5, 1, 2, 2, 22), 
(112, 1, 'BEATLES-LOVE_ME_DO', 5, 1, 3, 3, 22), 
(113, 1, 'BEATLES-LOVE_ME_DO', 5, 1, 4, 4, 22), 
(114, 1, 'BEATLES-LOVE_ME_DO', 5, 1, 5, 5, 22);

INSERT INTO `ap_items` (`id`, `type`, `ce_id`, `seq`, `text`) VALUES
(500, 1, 100, 1, 'Love, love me do'),
(501, 1, 101, 1, 'You know I love you'),
(502, 1, 102, 1, 'I''ll always be true'),
(503, 1, 103, 1, 'So pleeeease'),
(504, 1, 104, 1, 'Love me do'),
(600, 1, 110, 1, 'Can''t buy me love, love'),
(601, 1, 111, 1, 'Can''t buy me love'),
(602, 1, 112, 1, 'I''ll buy you a diamond ring my friend if it makes you feel alright'),
(603, 1, 113, 1, 'I''ll get you anything my friend if it makes you feel alright'),
(604, 1, 114, 1, 'Cause I don''t care too much for money, money can''t buy me love');