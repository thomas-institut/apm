/*
 * Copyright (C) 2017 Universität zu Köln
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
 * Author:  Rafael Nájera <rafael.najera@uni-koeln.de>
 * Created: May 18, 2017
 */

INSERT INTO `ap_people` (`id`, `fullname`, `email`) VALUES
(1, 'Averroes', NULL);

CREATE TABLE `ap_works` (
  `id` int(11) NOT NULL,
  `dare_id` varchar(5) DEFAULT '',
  `author_id` int(11) DEFAULT NULL,
  `title` varchar(512) DEFAULT NULL,
  `short_title` varchar(512) DEFAULT ''
) ENGINE=InnoDB DEFAULT CHARSET=utf8;


INSERT INTO `ap_works` (`id`, `dare_id`, `author_id`, `title`, `short_title`) VALUES
(1, 'AW1', 1, 'Short Commentary on the Organon', 'Short Commentary on the Organon'),
(2, 'AW2', 1, 'Middle Commentary on the Isagoge', 'Middle Commentary on the Isagoge'),
(3, 'AW3', 1, 'Middle Commentary on the Categories', 'Middle Commentary on the Categories'),
(4, 'AW4', 1, 'Middle Commentary on De Interpretatione', 'Middle Commentary on De Interpretatione'),
(5, 'AW5', 1, 'Middle Commentary on the Prior Analytics', 'Middle Commentary on the Prior Analytics'),
(6, 'AW6', 1, 'Middle Commentary on the Posterior Analytics', 'Middle Commentary on the Posterior Analytics'),
(7, 'AW7', 1, 'Middle Commentary on the Topics', 'Middle Commentary on the Topics'),
(8, 'AW8', 1, 'Middle Commentary on the Sophistici Elenchi', 'Middle Commentary on the Sophistici Elenchi'),
(9, 'AW9', 1, 'Middle Commentary on the Rhethorics', 'Middle Commentary on the Rhethorics'),
(10, 'AW10', 1, 'Middle Commentary on the Poetics', 'Middle Commentary on the Poetics'),
(11, 'AW11', 1, 'Long Commentary on the Posterior Analytics', 'Long Commentary on the Posterior Analytics'),
(12, 'AW12', 1, 'Discourse on Substantial and Accidental Universals', 'Discourse on Substantial and Accidental Universals'),
(13, 'AW13', 1, 'Treatise on the Copula and on Derived Nouns', 'Treatise on the Copula and on Derived Nouns'),
(14, 'AW14', 1, 'Discourse on Compound and Simple Predicates', 'Discourse on Compound and Simple Predicates'),
(15, 'AW15', 1, 'Discourse on the Definition and Critique of the Positions of Alexander and Alfarabi', 'Discourse on the Definition and Critique of the Positions of Alexander and Alfarabi'),
(16, 'AW16', 1, 'Critique of Avicenna\'s Position on the Conversion of Premises', 'Critique of Avicenna\'s Position on the Conversion of Premises'),
(17, 'AW17', 1, 'Critique of Themistius\' Position on the Contingent Syllogisms in the First and Second Figure', 'Critique of Themistius\' Position on the Contingent Syllogisms in the First and Second Figure'),
(18, 'AW18', 1, 'Treatise on Absolute Premises', 'Treatise on Absolute Premises'),
(19, 'AW19', 1, 'Discourse on the Types of Conclusions in Compound Syllogisms and on the Signification of \'Predicated of Everything\'', 'Discourse on the Types of Conclusions in Compound Syllogisms and on the Signification of \'Predicated of Everything\''),
(20, 'AW20', 1, 'Treatise on the Dependency of the Types of Conclusions from the Types of Premises', 'Treatise on the Dependency of the Types of Conclusions from the Types of Premises'),
(21, 'AW21', 1, 'On the Mixing of Contingent and Necessary Premises', 'On the Mixing of Contingent and Necessary Premises'),
(22, 'AW22', 1, 'Treatise on the Dependency of the Conclusions from Mixed Syllogisms', 'Treatise on the Dependency of the Conclusions from Mixed Syllogisms'),
(23, 'AW23', 1, 'Treatise on the Signification of \'Predicated of Everything\'', 'Treatise on the Signification of \'Predicated of Everything\''),
(24, 'AW24', 1, 'Treatise on Conditional Syllogisms', 'Treatise on Conditional Syllogisms'),
(25, 'AW25', 1, 'Discourse on the Predicates in Demonstrations', 'Discourse on the Predicates in Demonstrations'),
(26, 'AW26', 1, 'On Alfarabi\'s Book on Demonstration', 'On Alfarabi\'s Book on Demonstration'),
(27, 'AW27', 1, 'Discourse on the Definition of the Individual', 'Discourse on the Definition of the Individual'),
(28, 'AW28', 1, 'On the Three Types of Definition in Relation to Demonstration', 'On the Three Types of Definition in Relation to Demonstration'),
(29, 'AW29', 1, 'On Whether the Middle Term Is the Cause of the Major Term', 'On Whether the Middle Term Is the Cause of the Major Term'),
(30, 'AW30', 1, 'Treatise on the Disagreement of Alfarabi and Aristotle on the Order of the Posterior Analytics and the Rules of Demonstrations and Definitions', 'Treatise on the Disagreement of Alfarabi and Aristotle on the Order of the Posterior Analytics and the Rules of Demonstrations and Definitions'),
(31, 'AW31', 1, 'On the Conditions for the Necessity of the Premises of Demonstrations', 'On the Conditions for the Necessity of the Premises of Demonstrations'),
(32, 'AW32', 1, 'On How a Demonstration Can Be Transferred from One Science to Another', 'On How a Demonstration Can Be Transferred from One Science to Another'),
(33, 'AW33', 1, 'On Demonstrations Quia', 'On Demonstrations Quia'),
(34, 'AW34', 1, 'On the Sense in which the Definition Is Better Known than the Thing Defined', 'On the Sense in which the Definition Is Better Known than the Thing Defined'),
(35, 'AW35', 1, 'On the Definitions which Are Said to Differ from Demonstrations in Their Order', 'On the Definitions which Are Said to Differ from Demonstrations in Their Order'),
(36, 'AW36', 1, 'Short Commentary on the Physics', 'Short Commentary on the Physics'),
(37, 'AW37', 1, 'Middle Commentary on the Physics', 'Middle Commentary on the Physics'),
(38, 'AW38', 1, 'Long Commentary on the Physics', 'Long Commentary on the Physics'),
(39, 'AW39', 1, 'Short Commentary on De Caelo', 'Short Commentary on De Caelo'),
(40, 'AW40', 1, 'Middle Commentary on De Caelo', 'Middle Commentary on De Caelo'),
(41, 'AW41', 1, 'Long Commentary on De Caelo', 'Long Commentary on De Caelo'),
(42, 'AW42', 1, 'De Substantia Orbis', 'De Substantia Orbis'),
(43, 'AW43', 1, 'Short Commentary on De Generatione et Corruptione', 'Short Commentary on De Generatione et Corruptione'),
(44, 'AW44', 1, 'Middle Commentary on De Generatione et Corruptione', 'Middle Commentary on De Generatione et Corruptione'),
(45, 'AW45', 1, 'Short Commentary on the Meteorology', 'Short Commentary on the Meteorology'),
(46, 'AW46', 1, 'Middle Commentary on the Meteorology', 'Middle Commentary on the Meteorology'),
(47, 'AW47', 1, 'Commentary on De Animalibus', 'Commentary on De Animalibus'),
(48, 'AW48', 1, 'Commentary on De Plantis', 'Commentary on De Plantis'),
(49, 'AW49', 1, 'Aristotle\'s Intention at the Beginning of Book Seven of the Physics', 'Aristotle\'s Intention at the Beginning of Book Seven of the Physics'),
(50, 'AW50', 1, 'Remark on the Seventh and Eighth Book of the Physics', 'Remark on the Seventh and Eighth Book of the Physics'),
(51, 'AW51', 1, 'Treatise on Motion: Whether It Has a Beginning', 'Treatise on Motion: Whether It Has a Beginning'),
(52, 'AW52', 1, 'Treatise on Eternal and Temporal Being', 'Treatise on Eternal and Temporal Being'),
(53, 'AW53', 1, 'Treatise on Seeds and Sperm', 'Treatise on Seeds and Sperm'),
(54, 'AW54', 1, 'Treatise on the Celestial Body (1)', 'Treatise on the Celestial Body (1)'),
(55, 'AW55', 1, 'Treatise on the Celestial Body (2)', 'Treatise on the Celestial Body (2)'),
(56, 'AW56', 1, 'Treatise on the Celestial Body (3)', 'Treatise on the Celestial Body (3)'),
(57, 'AW57', 1, 'Treatise on the Substance of the Sphere', 'Treatise on the Substance of the Sphere'),
(58, 'AW58', 1, 'Discourse on a Question from De Caelo et Mundo', 'Discourse on a Question from De Caelo et Mundo'),
(59, 'AW59', 1, 'Discourse on the Motion of the Celestial Body (1)', 'Discourse on the Motion of the Celestial Body (1)'),
(60, 'AW60', 1, 'Discourse on the Motion of the Celestial Body (2)', 'Discourse on the Motion of the Celestial Body (2)'),
(61, 'AW61', 1, 'Discourse on the [...] of the Body which Moves in Circles', 'Discourse on the [...] of the Body which Moves in Circles'),
(62, 'AW62', 1, 'On Circular Motion', 'On Circular Motion'),
(63, 'AW63', 1, 'Treatise in Response to Avicenna\'s Division of Beings into the Merely Possible, the Possible in Itself but Necessary through Another, and the Necessary in Itself', 'Treatise in Response to Avicenna\'s Division of Beings into the Merely Possible, the Possible in Itself but Necessary through Another, and the Necessary in Itself'),
(64, 'AW64', 1, 'Treatise on the Prime Mover', 'Treatise on the Prime Mover'),
(65, 'AW65', 1, 'On the Separation of the First Principle', 'On the Separation of the First Principle'),
(66, 'AW66', 1, 'Treatise on the Harmony Between the Belief of the Peripatetics and that of the Theologians among the Learned of Islam Regarding the Manner of the World\'s Existence with Respect to Eternity and Origination', 'Treatise on the Harmony Between the Belief of the Peripatetics and that of the Theologians among the Learned of Islam Regarding the Manner of the World\'s Existence with Respect to Eternity and Origination'),
(67, 'AW67', 1, 'Short Commentary on De Anima', 'Short Commentary on De Anima'),
(68, 'AW68', 1, 'Middle Commentary on De Anima', 'Middle Commentary on De Anima'),
(69, 'AW69', 1, 'Long Commentary on De Anima', 'Long Commentary on De Anima'),
(70, 'AW70', 1, 'Commentary on the Parva Naturalia', 'Commentary on the Parva Naturalia'),
(71, 'AW71', 1, 'Epistle on the Possibility of Conjunction', 'Epistle on the Possibility of Conjunction'),
(72, 'AW72', 1, 'Treatise on the Conjunction of the Separate Intellect with Man', 'Treatise on the Conjunction of the Separate Intellect with Man'),
(73, 'AW73', 1, 'Treatise on the Conjunction of Intellect with Man', 'Treatise on the Conjunction of Intellect with Man'),
(74, 'AW74', 1, 'Treatise on the Intellect', 'Treatise on the Intellect'),
(75, 'AW75', 1, 'Commentary on Alexander\'s Treatise on the Intellect', 'Commentary on Alexander\'s Treatise on the Intellect'),
(76, 'AW76', 1, 'Commentary on Avempace\'s Epistle on the Conjunction of the Intellect with Man', 'Commentary on Avempace\'s Epistle on the Conjunction of the Intellect with Man'),
(77, 'AW77', 1, 'On Whether the Active Intellect Unites with the Material Intellect whilst it Is Clothed with the Body', 'On Whether the Active Intellect Unites with the Material Intellect whilst it Is Clothed with the Body'),
(78, 'AW78', 1, 'De Animae Beatitudine', 'De Animae Beatitudine'),
(79, 'AW79', 1, 'Short Commentary on the Metaphysics', 'Short Commentary on the Metaphysics'),
(80, 'AW80', 1, 'Middle Commentary on the Metaphysics', 'Middle Commentary on the Metaphysics'),
(81, 'AW81', 1, 'Long Commentary on the Metaphysics', 'Long Commentary on the Metaphysics'),
(82, 'AW82', 1, 'Middle Commentary on the Nicomachean Ethics', 'Middle Commentary on the Nicomachean Ethics'),
(83, 'AW83', 1, 'Epitome of Plato\'s Republic', 'Epitome of Plato\'s Republic'),
(84, 'AW84', 1, 'Epitome of the Almagest', 'Epitome of the Almagest'),
(85, 'AW85', 1, 'Colliget', 'Colliget'),
(86, 'AW86', 1, 'Commentary on Avicenna’s Cantica', 'Commentary on Avicenna’s Cantica'),
(87, 'AW87', 1, 'Commentary on Galen’s De Elementis', 'Commentary on Galen’s De Elementis'),
(88, 'AW88', 1, 'Commentary on Galen’s De Temperamentis (1)', 'Commentary on Galen’s De Temperamentis (1)'),
(89, 'AW89', 1, 'Commentary on Galen’s De Differentiis Febrium', 'Commentary on Galen’s De Differentiis Febrium'),
(90, 'AW90', 1, 'Commentary on Galen’s De Symptomatum Causis', 'Commentary on Galen’s De Symptomatum Causis'),
(91, 'AW91', 1, 'Treatise on Galen’s De Temperamentis (2)', 'Treatise on Galen’s De Temperamentis (2)'),
(92, 'AW92', 1, 'Treatise on the Moment of Crisis', 'Treatise on the Moment of Crisis'),
(93, 'AW93', 1, 'Treatise on the Theriac', 'Treatise on the Theriac'),
(94, 'AW94', 1, 'Treatise on the Preservation of Health', 'Treatise on the Preservation of Health'),
(95, 'AW95', 1, 'On Poisons', 'On Poisons'),
(96, 'AW96', 1, 'On Simple Drugs', 'On Simple Drugs'),
(97, 'AW97', 1, 'Rules Concerning Purgative Drugs', 'Rules Concerning Purgative Drugs'),
(98, 'AW98', 1, 'Consultation on Diarrhoea', 'Consultation on Diarrhoea'),
(99, 'AW99', 1, 'On the Correct Way Concerning the Methodus Medendi', 'On the Correct Way Concerning the Methodus Medendi'),
(100, 'AW100', 1, 'Epistle Dedicatory', 'Epistle Dedicatory'),
(101, 'AW101', 1, 'Decisive Treatise', 'Decisive Treatise'),
(102, 'AW102', 1, 'Book of the Exposition of the Methods of Proof Concerning the Beliefs of the Community', 'Book of the Exposition of the Methods of Proof Concerning the Beliefs of the Community'),
(103, 'AW103', 1, 'The Incoherence of the Incoherence', 'The Incoherence of the Incoherence'),
(104, 'AW104', 1, 'The Necessary on the Fundamentals of the Law', 'The Necessary on the Fundamentals of the Law'),
(105, 'AW105', 1, 'The Distinguished Jurist\'s Primer', 'The Distinguished Jurist\'s Primer'),
(106, 'AW106', 1, 'The Necessary on the Art of Grammar', 'The Necessary on the Art of Grammar'),
(107, 'AW107', 1, 'Commentary on Galen\'s De Virtutibus Naturalibus', 'Commentary on Galen\'s De Virtutibus Naturalibus');

ALTER TABLE `ap_works`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `dare_id` (`dare_id`),
  ADD KEY `author_id` (`author_id`);

ALTER TABLE `ap_works`
  ADD CONSTRAINT `ap_works_ibfk_1` FOREIGN KEY (`author_id`) REFERENCES `ap_people` (`id`);


CREATE TABLE `ap_chunks` (
  `id` int(11) NOT NULL,
  `dare_id` varchar(5) NOT NULL,
  `max_chunk_id` int(11) NOT NULL DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8;


ALTER TABLE `ap_chunks`
  ADD PRIMARY KEY (`id`),
  ADD KEY `dare_id` (`dare_id`);

ALTER TABLE `ap_chunks`
  ADD CONSTRAINT `ap_chunks_ibfk_1` FOREIGN KEY (`dare_id`) REFERENCES `ap_works` (`dare_id`);

INSERT INTO ap_chunks (id, dare_id)
  SELECT ap_works.id, ap_works.dare_id
  FROM ap_works WHERE ap_works.author_id=1;

UPDATE `ap_settings` SET `value` = '9' WHERE `ap_settings`.`setting` = 'dbversion';


INSERT INTO `ap_types_item` (`id`, `name`, `descr`) VALUES
(13, 'initial', 'Initial'),
(14, 'chunk', 'Chunk Mark');
