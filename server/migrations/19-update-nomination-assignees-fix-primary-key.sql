ALTER TABLE `nomination_assignees`
    DROP PRIMARY KEY,
    ADD PRIMARY KEY (`nomination_id`, `type`, `assignee_id`);
