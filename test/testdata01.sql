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
    (24, 'ringo', NULL, 'Ringo Starr'), 
    (25, 'jareh', NULL, 'Jaleh Ojan');


/*
 * Fake manuscript 1
 */

INSERT INTO `ap_elements` (`id`, `type`, `doc_id`, `page_number`, `column_number`, `seq`, `reference`, `editor_id`) VALUES
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

/*
 * a Hebrew manuscript
 */
INSERT INTO `ap_elements` (`id`, `type`, `doc_id`, `page_number`, `column_number`, `seq`, `reference`, `editor_id`, `lang`) VALUES
(200, 2,'BOOK-DARE-I-AT-VIE-ONB-20.L.73', 55, 1, 1, NULL, 25, 'he'),
(201, 1, 'BOOK-DARE-I-AT-VIE-ONB-20.L.73', 55, 1, 2, 1, 25, 'he'), 
(202, 1, 'BOOK-DARE-I-AT-VIE-ONB-20.L.73', 55, 1, 3, 2, 25, 'he'), 
(203, 1, 'BOOK-DARE-I-AT-VIE-ONB-20.L.73', 55, 1, 4, 3, 25, 'he'), 
(204, 1, 'BOOK-DARE-I-AT-VIE-ONB-20.L.73', 55, 1, 5, 4, 25, 'he'), 
(205, 1, 'BOOK-DARE-I-AT-VIE-ONB-20.L.73', 55, 1, 6, 5, 25, 'he'),
(206, 1, 'BOOK-DARE-I-AT-VIE-ONB-20.L.73', 55, 1, 7, 6, 25, 'he'), 
(207, 1, 'BOOK-DARE-I-AT-VIE-ONB-20.L.73', 55, 1, 8, 7, 25, 'he'), 
(208, 1, 'BOOK-DARE-I-AT-VIE-ONB-20.L.73', 55, 1, 9, 8, 25, 'he'), 
(209, 1, 'BOOK-DARE-I-AT-VIE-ONB-20.L.73', 55, 1, 10, 9, 25, 'he'), 
(210, 1, 'BOOK-DARE-I-AT-VIE-ONB-20.L.73', 55, 1, 11, 10, 25, 'he'),
(211, 5, 'BOOK-DARE-I-AT-VIE-ONB-20.L.73', 55, 1, 12, NULL, 25, 'he');

INSERT INTO `ap_items` (`id`, `type`, `ce_id`, `seq`, `lang`, `text`, `alt_text`, `extra_info`, `length`) VALUES
(700, 1, 200, 1, 'he', 'הוא', NULL, NULL, NULL),
(701, 1, 201, 1, 'he',  'המתדבק ', NULL, NULL, NULL),
(7011, 2, 201, 2, 'he',  'יתחבר', NULL, NULL, NULL),
(7012, 1, 201, 3, 'he',  ' מדברים יתדבקו קצתם בקצת הנה הוא', NULL, NULL, NULL),
(702, 1, 202, 1, 'he', 'ממה שיראה בנפשו אצל ההשתכלות והנה אפשר  ש', NULL, NULL, NULL),
(703, 1, 203, 1, 'he', '''שנבארהו על צד ההראו'' וזה כי המתדבק אם חובר מדברי', NULL, NULL, NULL),
(704, 1, 204, 1, 'he', 'בלתי מתדבקים ולא נפגשי'' הנה יתחייב בהכרח שיתחבר', NULL, NULL, NULL),
(705, 1, 205, 1, 'he', 'מדברים נמשכי'' כמו', NULL, NULL, NULL),
(7051, 9, 205, 2, NULL, NULL, NULL, NULL, NULL),
(7052, 1, 205, 3, 'he', ' שיתחבר המספר ויהיה הכמות הנפרד', NULL, NULL, NULL),
(706, 1, 206, 1, 'he', 'מתדבק וגם כן כאשר הנחנו זה הנה הנקודות הנמשכות', NULL, NULL, NULL),
(7061, 5, 206, 2, NULL, NULL, NULL, 'illegible', 4), 
(707, 1, 207, 1, 'he', 'לא ימלט שיהיה ביניהם מרחק או לא יהיה שם מרחק ואם', NULL, NULL, NULL),
(708, 1, 208, 1, 'he', 'לא יהיה ביניהם מרחק כלל הנה הם אם נוגעות ואם', NULL, NULL, NULL),
(7081, 4, 208, 2, 'he', ' כלל', '', 'damaged', NULL),
(709, 1, 209, 1, 'he', 'מתדבקות ', NULL, NULL, NULL),
(7091, 3, 209, 2, 'he', 'ואם', 'ום', NULL, NULL),
(7092, 1, 209, 3, 'he', 'ואם היה ביניהם מרחק הנה אפשר שתונח בין ', NULL, NULL, NULL),
(710, 1, 210, 1, 'he', 'כל שתי נקודות מן הנקודות הנמשכות יותר מנקודה אחת', NULL, NULL, NULL),
(711, 1, 211, 1, 'he', ' וגם', NULL, NULL, NULL);

INSERT INTO `ap_ednotes` (`id`, `type`, `target`, `lang`, `author_id`, `text`) VALUES
(1, 2, 7091, 'en', 21, 'I did it!'), 
(2, 2, 7051, 'en', 22, 'This is a note');


