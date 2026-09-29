CREATE TABLE `auditEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventName` varchar(80) NOT NULL,
	`sessionId` varchar(120),
	`path` varchar(255),
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auditEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `auditLeads` ADD `consentAt` timestamp;--> statement-breakpoint
ALTER TABLE `auditLeads` ADD `consentVersion` varchar(40);--> statement-breakpoint
ALTER TABLE `auditLeads` ADD `consentPurpose` varchar(255);--> statement-breakpoint
ALTER TABLE `auditLeads` ADD `source` varchar(80);--> statement-breakpoint
ALTER TABLE `auditLeads` ADD `utmSource` varchar(120);--> statement-breakpoint
ALTER TABLE `auditLeads` ADD `utmMedium` varchar(120);--> statement-breakpoint
ALTER TABLE `auditLeads` ADD `utmCampaign` varchar(120);--> statement-breakpoint
ALTER TABLE `auditLeads` ADD `pdfGeneratedAt` timestamp;