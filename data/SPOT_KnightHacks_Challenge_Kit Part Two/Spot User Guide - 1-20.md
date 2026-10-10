# Spot User Guide - 1-20

> Markdown copy of `Spot User Guide - 1-20.pdf` (Boston Dynamics Spot User Guide, Release 1.1). Text extracted automatically; figures and diagrams are not included (their text labels are listed as *Figure labels*). See the PDF for images.


---

<!-- PDF page 1 -->

*Figure labels: BostonDynamics Pa 4*

## SPOT USER GUIDE

**RELEASE 1.1 VERSION A**

---

<!-- PDF page 2 -->

_(This page contains only images/diagrams.)_

---

<!-- PDF page 3 -->

#### 01

##### **INTRODUCING SPOT**

HELLO 01 SYSTEM CONTENTS 02 BODY 03 BUTTONS & PORTS 05 POWER & MOTOR LIGHTS 06 STATUS LIGHTS 07 CONTROLLER 08 OPERATING MODES 08

#### 09

##### **SAFETY**

TRAINING 09 SAFETY DISTANCE **09** COLLISIONS 10 FALLS 10 SAFETY IN HANDLING 12 PINCH POINTS 12 ACTIVE MOTORS 12 BATTERY SAFETY 13 BYSTANDER SAFETY 13

#### 14

##### **HANDLING SPOT**

|MOTOR LOCKOUT|14|
|---|---|
|HANDLES|14|
|LIFTING SPOT|15|
|PLACING SPOT IN CASE|15|
|ROLLING SPOT|16|
|ROLLING SPOT ONTO ITS BACK|16|
|ROLLING SPOT UPRIGHT|17|

#### 18

##### **SETUP**

|BATTERY & POWER|18|
|---|---|
|DETERMINING BATTERY LEVEL|18|
|BATTERY LIFE|18|
|INSERTING BATTERY|18|
|CHARGING SYSTEM|19|
|CHARGER ENVIRONMENT|20|
|HOT-SWAPPING BATTERY|20|

---

<!-- PDF page 4 -->

##### **OPERATION**

|OPERATING ENVIRONMENT|21|BODY POSING|**28**|
|---|---|---|---|
|TURNING ON SPOT|23|WALKING SPOT|29|
|CONNECTING CONTROLLER|23|CHANGING SPEED|29|
|STOPPING ROBOT|24|CHANGING BODY HEIGHT|29|
|REGULAR STOP|24|CHANGING GAITS|30|
|EMERGENCY STOP|24|NAVIGATING STAIRS|31|
|AUTOMATIC STOP|24|LIMITATIONS|31|
|TURNING ON MOTORS|24|SPOT CAM PAYLOAD|32|
|SELF-RIGHT|25|OPERATING SPOT CAM|32|
|SIT & STAND|25|SAVING IMAGES TO USB STICK|34|
|OBSTACLE AVOIDANCE|26|BROADCASTING AUDIO|36|
|LIMITATIONS|27|TROUBLESHOOTING SPOT CAM|37|

---

<!-- PDF page 5 -->

##### **OPERATION CONT.**

|TELEOPERATION|38|||
|---|---|---|---|
|RANGE|38|AUTOWALK SETUP|41|
|SWITCH TO TELEOPERATION|38|PLACING FIDUCIALS|41|
|DRIVE WITH JOYSTICKS|38|RECORDING A MISSION|42|
|TOUCH TO GO|38|ADDING ACTIONS TO A MISSION|42|
|AUTOWALK|39|DELETING A MISSION|42|
|MISSIONS|39|REPLAYING A MISSION|43|
|NAVIGATION|39|MONITORING A MISSION|43|
|FIDUCIALS|39|SKIPPING PART OF A MISSION|43|
|WAYPOINTS|40|TROUBLESHOOTING AUTOWALK|44|
|ACTIONS|40|TURNING SPOT OFF|46|
|LIMITATIONS|40|SHIPPING|**46**|

---

<!-- PDF page 6 -->

#### 52

##### **MAINTENANCE**

|INSPECTION|52|
|---|---|
|CLEANING|52|
|RECALIBRATING SPOT|53|
|ABOUT SPOTCHECK|53|
|WHEN TO RUN SPOTCHECK|53|
|JOINT CAL & CAMERA CHECK|54|
|CAMERA CALIBRATION|55|

##### **SYSTEM ADMIN**

DEFAULTS 47 CAMERA CALIBRATION 55 ADMIN PAGE 47 CONNECTING TO WEBUI 47 NETWORK SETUP 48 CONNECTING TO SHARED WIFI 49 57 SWITCHING TO HOSTED WIFI 49 ADMIN TASKS 50 PERMISSIONS 50 **SERVICE & REPAIR** CHANGING DEFAULT PASSWORDS 50 ADDING ADDITIONAL USERS 50 TROUBLESHOOTING 57 ABOUT PAGE 50 TRY THIS FIRST 57 SET ROBOT NICKNAME 50 CONTACT SUPPORT 57 REPORTING BUGS 51 STARTUP ISSUES 57 LOG DOWNLOADS 51 RETURN SHIPPING 57

---

<!-- PDF page 7 -->

#### 58

##### **COMPLIANCE**

|SPOT SYSTEM|58|
|---|---|
|FCC COMPLIANCE|58|
|DECLARATION OF CONFORMITY|58|
|SPOT ROBOT|59|
|RADIO|59|
|LASER|59|
|SPOT BATTERY|60|
|DISPOSAL|60|
|SPOT CHARGER|60|

##### **SPECIFICATIONS**

SPECIFICATIONS

|**LEGEND**|
|---|

WARNING: Indicates a hazardous situation which, if not avoided, could result in death or serious injury. Such situation could also result in significant damage to the robot or property.

CAUTION: Indicates a hazardous situation which, if not avoided, could result in minor to moderate injury. Such situation could also result in minor to moderate damage to the robot or property.

NOTE: Addresses practices not related to safety, including tips to maximize performance and prevent damage to the robot

---

<!-- PDF page 8 -->

_(This page contains only images/diagrams.)_

---

<!-- PDF page 9 -->

HELLO

We’ve built the world’s most advanced four-legged robot. Spot is small enough to navigate human environments, but nimble enough to traverse nearly any terrain. Spot dynamically balances, but is easy to control. As Spot takes its first steps out of the lab, it represents a giant leap toward a future of general-purpose robotics.

Robotics is a team sport. Boston Dynamics has built the platform – and it’s up to you to put it to work. With this user guide, a growing list of payloads, evolving software capabilities, and accessible development kits, you have the tools to leverage this technology to its fullest.

###### **It’s time to change the world’s idea of what robots can do. Let’s get started.**

---

<!-- PDF page 10 -->

SYSTEM CONTENTS

- Spot Robot

- Battery (x2)

- Charger

- Controller

*Figure labels: S e s*

*Figure labels: =a*

---

<!-- PDF page 11 -->

*Figure labels: BODY · BODY · BACK · HIP · C y —7 · TOP · BOTTOM · UPPER · LEG · KNEE · ‘iat · FRONT · LOWER · LEG · / ud) rT | · / a WU · Ww i · FOOT · INTRODUCING SPOT THREE-QUARTER VIEW*

*Figure labels: INTRODUCING SPOT*

---

<!-- PDF page 12 -->

*Figure labels: MOUNTING RAIL · (x2) · PAYLOAD PORT · (x2) · HANDLE · (x4) · STEREO CAMERA · (x5) STATUS LIGHT · (x2)*

*Figure labels: V A -*

**THREE-QUARTER VIEW**

---

<!-- PDF page 13 -->

*Figure labels: INTRODUCING SPOT*

*Figure labels: BUTTONS · & PORTS*

*Figure labels: BACK VIEW*

*Figure labels: POWER · PORT & COVER · POWER MOTOR ETHERNET · BUTTON LOCKOUT PORT & CAP · BUTTON · fail · STATE OF CHARGE (SOC) BUTTON · Shows the battery charge level; · located on the battery · BOTTOM VIEW*

---

<!-- PDF page 14 -->

# POWER & MOTOR **POWER LOCKOUT ROBOT** LIGHTS **BUTTON BUTTON STATUS** <mark>e</mark> ~~e~~

**NO LIGHTS:** Robot and motors off (lockout engaged)

**BACK VIEW**

*Figure labels: la-eN*

**BLUE LIGHT** : Computers on, motors off (lockout engaged)

**SLOWLY FLASHING RED LIGHT** : Motors available but not powered

*Figure labels: OD*

**QUICKLY FLASHING RED LIGHT** : Motors turning on

POWER AND MOTOR LIGHTS

**SOLID RED LIGHT:** Motors on - stay at least 2m away

---

<!-- PDF page 15 -->

###### **POWER**

*Figure labels: INTRODUCING SPOT*

STATUS LIGHTS

*Figure labels: ag · as) igs)*

Yellow:

System booting up

Moving rainbow: Powered on, ready to connect

Solid rainbow: Plugged in, no battery

Rainbow dots: Charging, dots show % charge

###### **MOTORS**

Solid blue:

Lockout button engaged; Spot is safe to handle

Slow blink green: Spot connected; motors may turn on

*Figure labels: . (*

Fast blink green: Motors turning on!

Solid green: Motors on

###### **ERRORS**

Blinking orange: Serious error or perception fault has occurred; operation degraded

---

<!-- PDF page 16 -->

**OPERATING MODES** Spot’s controller has two operating modes. Change between the modes in the settings menu. CONTROLLER **Standard Mode** : Provides easy-to-use control for <mark>_</mark> most situations. **Demo Mode:** Enables demonstration gaits and Spot is controlled by an android app running on adds additional button controls to make it easy a tablet. The Spot System includes an Android to switch modes. gaming tablet with physical buttons for easy robot control. **STATUS BAR E-STOP** Cuts motor power **SETTINGS MENU MODE D-PAD BUTTONS** Shortcuts (Directional to control buttons) Spot’s Controls motion camera view ~~i~~ **ACTION MENU** Controls how Spot moves **LEFT JOYSTICK RIGHT JOYSTICK** Moves Spot manually Moves Spot manually

---

<!-- PDF page 17 -->

### TRAINING

**Proper training:** Do not use Spot without reading this user guide and understanding safe operation of the robot.

**Responsible use of Spot is crucial to prevent dangerous conditions** for operators and others nearby. Make sure to read, understand and comply with this user guide to lessen the risk of serious injury, death, or robot and other property damage.

It is the operator’s responsibility to ensure that **bystanders are trained in safe behavior around Spot** , and that the operation of Spot does not put anyone at risk.

### SAFETY DISTANCE

Spot is not suitable for tasks that require operation in close proximity to people. **People must stay a safe distance (at least 2m) from Spot during operation to avoid injury.** Injuries may be caused by collisions, Spot falling or tipping onto people, or contact with Spot’s pinch points.

Spot is suitable for areas where access is limited to trained personnel. Keep untrained people away from Spot during operation to avoid injury.

Spot may sometimes move unpredictably or fall. Only use Spot in areas where a fall or collision will not result in an unacceptable risk.

---

<!-- PDF page 18 -->

*Figure labels: ; 2m YoI\*

###### **COLLISIONS**

**Spot can collide with people or objects, even with its obstacle detection system enabled.**

- People around Spot should keep a safe distance of at least 2m from the robot while it is operating on level ground. Do not stand between Spot and a wall or other fixed object if this could violate the 2m safety perimeter.

- Do not operate Spot within 2m of delicate equipment or other property that may be damaged by the robot. Operators and anyone nearby should assume that Spot may move unexpectedly at any time.

###### **FALLS**

**Spot may sometimes fall.** Falls can damage Spot or the surrounding environment and injure operators and bystanders. Keep a safe distance of at least 2m from Spot while it is operating.

Never stand below Spot on stairways, elevated platforms, or inclines. For example, if Spot is at the top of a stairway, stay at least 2m away from the stairway bottom or any open areas on the side of the stairway and remain vigilant at all times to avoid a falling Spot. If Spot falls from an elevated position, it can cause serious injury or death.

---

<!-- PDF page 19 -->

###### **The following conditions may cause Spot to fall:**

*Figure labels: SAFETY*

|**Stairs or inclines**|If Spot loses balance on the stairs or an incline, it may slip and fall.|
|---|---|
|**Holes,**<br>**elevated grounds,**<br>**or cliffs**|Spot cannot detect cliff edges and may walk off cliff edges that are<br>unblocked. Block cliff edges with secure guardrails or safety netting. Never<br>work below an elevated Spot.|
|**Signal loss**|If Spot loses its wireless connection to the controller, it will sit after 3 seconds,<br>and the motors will shut off after 8 seconds. If  this occurs on stairs, slope, or<br>other uneven surface, Spot may slide or fall upon attempting to sit.|
|**Slippery surfaces**|Spot has difficulty walking, and may fall, on slippery surfaces. This includes<br>surfaces made slippery by sand, dust, and liquids, for example.|
|**Cords**|Spot cannot detect when its legs are entangled in cords, which may cause it<br>to trip and fall. The entagled cord and anything connected to it may also be<br>damaged.|
|**Unstable objects**<br>**shorter than**<br>**30 cm**|Spot may not automatically avoid unstable objects that are fully or partially<br>less than 30 cm above the ground, such as human feet and backpacks, and<br>may fall upon stepping on such objects.|
|**Transparent,**<br>**mirrored, or very**<br>**bright obstacles**|These can confuse Spot’s obstacle detection system.|
|**Moving surfaces**|Spot can become unstable on moving surfaces, such as elevators, escalators,<br>moving walkways and ramps, vehicles, or boats. Put robot in lockout mode<br>when transporting on moving platform.|

---

<!-- PDF page 20 -->

### SAFETY IN HANDLING

###### **ACTIVE MOTORS**

**Fingers may break or get amputated if caught in joints while Spot’s motors are active.** Stay at least 2m away when Spot is powered on (except to press the lockout or power buttons).

###### **PINCH POINTS**

Spot’s joints can pinch fingers and other body parts and entangle loose clothing, long hair, and jewelry.

1. Never touch Spot when motors are active. Stay at least 2m away at all times.

Only handle Spot when the motors are locked out (see page 14) or robot power is off.

2. Before handling Spot, engage lockout to ensure motors can’t turn on.

**HIP JOINT**

*Figure labels: KNEE JOINT*

Always keep hands away from hip joint, except when grabbing handles. Always make a fist when gripping handles to keep your fingers away from pinch points.

Always keep hands away from knee joint. Use caution when lowering Spot or closing the leg.
