-- Core Elements to install WNFramework
-- To be called from install.py


DROP TABLE IF EXISTS `__SessionCache`;
CREATE TABLE `__SessionCache` (
	`user` varchar(120) DEFAULT NULL,
	`country` varchar(120) DEFAULT NULL,
	`cache` longtext
) ENGINE=MyISAM DEFAULT CHARSET=utf8;


DROP TABLE IF EXISTS `tabDocField`;
CREATE TABLE `tabDocField` (
	`name` varchar(120) NOT NULL,
	`creation` datetime DEFAULT NULL,
	`modified` datetime DEFAULT NULL,
	`modified_by` varchar(40) DEFAULT NULL,
	`owner` varchar(40) DEFAULT NULL,
	`docstatus` int(1) DEFAULT '0',
	`parent` varchar(120) DEFAULT NULL,
	`parentfield` varchar(120) DEFAULT NULL,
	`parenttype` varchar(120) DEFAULT NULL,
	`idx` int(8) DEFAULT NULL,
	`fieldname` varchar(180) DEFAULT NULL,
	`label` varchar(180) DEFAULT NULL,
	`fieldtype` varchar(180) DEFAULT NULL,
	`options` text,
	`search_index` int(1) DEFAULT NULL,
	`unique` int(1) DEFAULT NULL,
	`hidden` int(1) DEFAULT NULL,
	`print_hide` int(1) DEFAULT NULL,
	`report_hide` int(1) DEFAULT NULL,
	`reqd` int(1) DEFAULT NULL,
	`no_copy` int(1) DEFAULT NULL,
	`allow_on_submit` int(1) DEFAULT NULL,
	`trigger` varchar(180) DEFAULT NULL,
	`depends_on` varchar(180) DEFAULT NULL,
	`permlevel` int(1) DEFAULT NULL,
	`width` varchar(180) DEFAULT NULL,
	`default` text,
	`description` text,
	`in_filter` int(1) DEFAULT NULL,
	PRIMARY KEY (`name`),
	KEY `parent` (`parent`),
	KEY `label` (`label`),
	KEY `fieldtype` (`fieldtype`),
	KEY `fieldname` (`fieldname`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;


DROP TABLE IF EXISTS `tabDocPerm`;
CREATE TABLE `tabDocPerm` (
	`name` varchar(120) NOT NULL,
	`creation` datetime DEFAULT NULL,
	`modified` datetime DEFAULT NULL,
	`modified_by` varchar(40) DEFAULT NULL,
	`owner` varchar(40) DEFAULT NULL,
	`docstatus` int(1) DEFAULT '0',
	`parent` varchar(120) DEFAULT NULL,
	`parentfield` varchar(120) DEFAULT NULL,
	`parenttype` varchar(120) DEFAULT NULL,
	`idx` int(8) DEFAULT NULL,
	`permlevel` int(11) DEFAULT NULL,
	`role` varchar(180) DEFAULT NULL,
	`match` varchar(180) DEFAULT NULL,
	`read` int(1) DEFAULT NULL,
	`write` int(1) DEFAULT NULL,
	`create` int(1) DEFAULT NULL,
	`submit` int(1) DEFAULT NULL,
	`cancel` int(1) DEFAULT NULL,
	`amend` int(1) DEFAULT NULL,
	`execute` int(1) DEFAULT NULL,
	PRIMARY KEY (`name`),
	KEY `parent` (`parent`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;


DROP TABLE IF EXISTS `tabDocType`;
CREATE TABLE `tabDocType` (
  `name` varchar(180) NOT NULL DEFAULT '',
  `creation` datetime DEFAULT NULL,
  `modified` datetime DEFAULT NULL,
  `modified_by` varchar(180) DEFAULT NULL,
  `owner` varchar(180) DEFAULT NULL,
  `docstatus` int(1) DEFAULT '0',
  `parent` varchar(120) DEFAULT NULL,
  `parentfield` varchar(120) DEFAULT NULL,
  `parenttype` varchar(120) DEFAULT NULL,
  `idx` int(8) DEFAULT NULL,
  `search_fields` varchar(180) DEFAULT NULL,
  `issingle` int(1) DEFAULT NULL,
  `istable` int(1) DEFAULT NULL,
  `version` int(11) DEFAULT NULL,
  `module` varchar(180) DEFAULT NULL,
  `autoname` varchar(180) DEFAULT NULL,
  `name_case` varchar(180) DEFAULT NULL,
  `description` text,
  `colour` varchar(180) DEFAULT NULL,
  `read_only` int(1) DEFAULT NULL,
  `in_create` int(1) DEFAULT NULL,
  `allow_print` int(1) DEFAULT NULL,
  `allow_email` int(1) DEFAULT NULL,
  `allow_copy` int(1) DEFAULT NULL,
  `allow_rename` int(1) DEFAULT NULL,
  `allow_attach` int(1) DEFAULT NULL,
  `max_attachments` int(11) DEFAULT NULL,
  `is_submittable` int(1) DEFAULT NULL,
  `in_dialog` int(1) DEFAULT NULL,
  `hide_heading` int(1) DEFAULT NULL,
  `read_only_onload` int(1) DEFAULT NULL,
  `document_type` varchar(180) DEFAULT NULL,
  `default_print_format` varchar(180) DEFAULT NULL,
  `hide_toolbar` int(1) DEFAULT NULL,
  PRIMARY KEY (`name`),
  KEY `parent` (`parent`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;


DROP TABLE IF EXISTS `tabSeries`;
CREATE TABLE `tabSeries` (
	`name` varchar(40) DEFAULT NULL,
	`current` int(10) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;


DROP TABLE IF EXISTS `tabSessions`;
CREATE TABLE `tabSessions` (
	`user` varchar(40) DEFAULT NULL,
	`sid` varchar(120) DEFAULT NULL,
	`sessiondata` longtext,
	`ipaddress` varchar(16) DEFAULT NULL,
	`lastupdate` datetime DEFAULT NULL,
	`status` varchar(20) DEFAULT NULL
) ENGINE=MyISAM DEFAULT CHARSET=utf8;


DROP TABLE IF EXISTS `tabSingles`;
CREATE TABLE `tabSingles` (
	`doctype` varchar(40) DEFAULT NULL,
	`field` varchar(40) DEFAULT NULL,
	`value` text,
	KEY `doctype` (`doctype`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

DROP TABLE IF EXISTS `__PatchLog`;
CREATE TABLE `__PatchLog` (
	`patch` TEXT,
	`applied_on` DATETIME
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

