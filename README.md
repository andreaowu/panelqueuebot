# Panel Queue Discord Bot

## Introduction
This is a Discord bot intended to help virtual classroom management, particularly for office hours and lab sections.

For office hours, there is a queue panel for students to get in or out of line, and the instructor can remove students from the line accordingly. 

For labs, there is the same queue panel for students to get in or out of line, and when an instructor and/or TA's remove students from the line, a text and voice channel can be created to help students solve problems. The instructor and student will be notified in the text channel, and they can either use chat or voice / screenshare.

## Usage
To use the Discord bot, [here](https://discord.com/api/oauth2/authorize?client_id=735918166470819850&permissions=8272&scope=bot) is the invite link.

Once the Discord bot is invited to a server, it will automatically create a **PanelQueue** category with two text channels: **queue** and **bot-help**.

### queue
There is a panel that will always be shown here, and it will be the only item shown. Inside the panel, the length of the line and the order of students in the line will be shown. Everyone in the server can also add and remove hemselves to and from the queue by reacting to the emoji below the panel.

Instructors and/or TA's have permission to take students out of the queue using these two commands:
```
!next: removes next student from queue and refreshes panel
!ticket: removes next student from queue, creates a category with a text and voice channel, and notifies student from the text channel
```

### bot-help
Only those with 'mod' roles will be able to see this channel. Students will not be able to access this, because the only action they'll be able to take is to get in and out of line. This channel is intended for the instructor(s) and TA's to see the bot's commands.

When a mod removes a student from the line, this channel will also receive a message saying who removed which student from line.
