CREATE TABLE `qualifyMessages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`prospectId` int NOT NULL,
	`discordMessageId` varchar(32),
	`direction` enum('inbound','outbound','system') NOT NULL,
	`content` text NOT NULL,
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `qualifyMessages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `qualifyNotes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`prospectId` int NOT NULL,
	`authorId` int NOT NULL,
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `qualifyNotes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `qualifyProspects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`discordUserId` varchar(32) NOT NULL,
	`discordUsername` varchar(191),
	`displayName` varchar(191),
	`email` varchar(320),
	`company` varchar(191),
	`activity` varchar(191),
	`situation` text,
	`mainProblem` text,
	`objective` text,
	`needs` text,
	`urgency` varchar(40),
	`budget` varchar(80),
	`interestLevel` enum('unknown','low','medium','high','hot') NOT NULL DEFAULT 'unknown',
	`status` enum('new','audit_in_progress','audited','follow_up','hot','meeting','client','unqualified','paused') NOT NULL DEFAULT 'new',
	`auditStep` int NOT NULL DEFAULT 0,
	`agentMode` enum('active','human') NOT NULL DEFAULT 'active',
	`summary` text,
	`privateNotes` text,
	`joinedAt` timestamp NOT NULL DEFAULT (now()),
	`lastActivityAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `qualifyProspects_id` PRIMARY KEY(`id`),
	CONSTRAINT `qualifyProspects_discordUserId_unique` UNIQUE(`discordUserId`)
);
