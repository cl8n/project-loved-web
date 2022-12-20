CREATE USER 'project_loved'@'%' IDENTIFIED BY '';
GRANT ALL PRIVILEGES ON `project_loved`.* TO 'project_loved'@'%' WITH GRANT OPTION;
FLUSH PRIVILEGES;

CREATE DATABASE `project_loved`
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_0900_as_cs;
