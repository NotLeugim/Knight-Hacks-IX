# Spot User Guide - 31-72

> Markdown copy of `Spot User Guide - 31-72.pdf` (Boston Dynamics Spot User Guide, Release 1.1). Text extracted automatically; figures and diagrams are not included (their text labels are listed as *Figure labels*). See the PDF for images.


---

<!-- PDF page 31 -->

# CONNECTING CONTROLLER

*Figure labels: OPERATION*

# TURNING ON SPOT

1. Make sure Spot:

   - Has charged battery

   - Is unplugged from power and ethernet

   - Power plug cover and ethernet cover are inserted

   - Is at least 2m away from people

2. Press and hold Power button for two seconds

3. Fans will turn on and spin loudly. Wait until fans turn off and status rainbow lights start blinking, approximately two minutes.

NOTE: Power and ethernet covers can block rear camera. Ensure they are properly seated before operating.

Spot has built-in WiFi. It hosts its own WiFi network and can join an existing network. Default usernames and passwords for Spot’s WiFi are stored in the battery compartment. Payloads can expand Spot’s connection options. Ask your system administrator for the preferred connection options for Spot.

1. Power on controller.

2. Open Boston Dynamics application.

3. Select the appropriate network as directed by your system administrator. For most initial configurations, this is Spot’s built-in access point. To set up the network see the System Administration section on page 48.

4. Either select robot or add robot to network using “Add Robot.”

5. Enter user name and password.

6. Select “Operate.”

---

<!-- PDF page 32 -->

# STOPPING THE ROBOT

## **REGULAR STOP**

Press the controller’s **B button** to stop Spot. It will pause and stand in place. If Spot is seated, it will remain seated. **In an emergency, use the emergency stop as described below.**

## **EMERGENCY STOP**

Spot’s emergency stop (E-STOP) provides a secure way to cut motor power. It takes priority over all other robot controls. When an E-STOP is commanded, motor power is cut, causing Spot to collapse to the ground. Motors cannot be turned on until the E-STOP is cancelled.

**In an emergency, use the E-STOP to halt Spot immediately, unless on stairs or other such position where a collapsing Spot would cause more harm than the failure to E-STOP the robot.**

- Press controller **trigger buttons** and **B button** simultaneously.

- To immediately power off all motors, select red **E-STOP button** in controller’s top right corner. Select Confirm.

- Spot will collapse to the ground.

- Motors cannot power on again until E-Stop is canceled.

   - CAUTION: Emergency stop makes robot collapse. **Emergency stopping Spot on stairs is dangerous.** Robot will collapse and may fall down stairs. Never stand below a robot on stairs. If Spot trips or is E-Stopped it will fall down stairs and can injure anyone below it.

## **AUTOMATIC STOP**

Spot monitors its sensors and can automatically pause movement or cut power in certain situations.

**Signal loss:** After 3 seconds without controller communication, Spot will sit. After 8 seconds without communication, Spot will turn off its motors.

WARNING: Losing signal on stairs could result in a fall. Use caution to ensure strong signals on stairs.

**Smart freeze:** When Spot detects a fall it will cushion leg movement to minimize damage from the fall.

TURNING ON MOTORS

Before turning on motors, release lockout button. Button light will pulse red.

### **Turn on motor power:**

1. Ensure that no person is within 2m of Spot.

2. Announce loudly: “Power on Spot.”

3. Turn on motor power using on-screen instructions in controller app.

---

<!-- PDF page 33 -->

# SELF-RIGHT

Spot can sometimes end up on its back or on the ground with its legs in an unusual position. Self-righting flips Spot over and positions its legs to be ready to stand.

NOTE: Do not use self-right on uneven surfaces, slippery surfaces, or near other objects.

To self-right Spot:

1. Using the controller’s action bar, press and hold “Stand” and then “Self-right.”

2. Robot will attempt to roll over by moving its legs.

3. Robot will stop moving and then sit.

If Spot fails to self-right:

1. Turn off motors via controller app. Press **lockout button** on robot.

2. Spot’s limbs will go slack. If Spot is upright or standing, it will fall.

3. Manually move legs and body into “sit” position, avoiding hip / knee pinch points.

4. Release **lockout button.**

5. Use controller to turn on motor power; attempt self-right maneuver again.

# SIT & STAND

*Figure labels: fy WW*

Press the **Sit** button to sit Spot on ground.

*Figure labels: ~ · J*

Press the **Stand** button to stand Spot in place.

---

<!-- PDF page 34 -->

# OBSTACLE AVOIDANCE

Spot uses its perception system to automatically avoid running into obstacles. The perception system consists of five stereo cameras with a 360<sup>o</sup> field of view and a detection range up to 4 m.

To adjust how close Spot can get to an obstacle, move the Perception tab’s “Avoid distance” slider to a distance between 0.1 and 0.5 m. Larger avoidance distances may prevent Spot from traversing doorways and other confined spaces.

CAUTION: Spot can collide with people or objects, even with its obstacle detection system enabled. Operators and anyone nearby should assume that Spot may move unexpectedly at any time. Only use Spot in areas where a fall or collision will not result in an unacceptable risk.

---

<!-- PDF page 35 -->

## **LIMITATIONS**

The following conditions can hamper the robot’s obstacle detection system, which may result in collisions:

- **Demo: Obstacle avoidance** 1. Place sample obstacle into demonstration area. Sample should be at least 50 cm on each side, with a minimum height of 50 cm, and resting on the ground. Never use people as obstacles!

- 2. Walk Spot towards the obstacle. Spot should avoid colliding with it.

|**Very thin**<br>**obstacles**|< 3 cm in thickness. For example, ladders and tripods.|
|---|---|
|**High contrast**<br>**environments**|Spot’s perception system has difficulty with high contrast environments<br>such as very black materials against very bright backgrounds.|
|**Clear materials**|Spot cannot see transparent materials and may crash into glass doors<br>and windows.|
|**Short objects**|Spot may step on paint cans, buckets, and other objects shorter than 30 cm<br>even with obstacle avoidance enabled.|
|**Moving objects**|Spot cannot predict trajectories of moving objects. Do not operate<br>Spot around moving objects such as vehicles, children, or pets.|
|**Elevated**<br>**obstacles**|Do not walk Spot under ropes, tables, scaffolds, or low-hanging but<br>elevated obstacles. These can collide with Spot or its payloads.|
|**Inadequate**<br>**lighting**|Spot requires at least 2 lux for cameras to function properly. Even in well-lit<br>environments, shadowy areas may be too dark for Spot to detect obstacles.|

NOTE: When walking Spot through soft objects like curtains, tall grass, or brush, it may be useful to turn off obstacle avoidance. However, Spot will now collide with all obstacles. It is up to the operator to avoid obstacles in this mode.

---

<!-- PDF page 36 -->

*Figure labels: OPERATION*

The controller’s joysticks can pose Spot’s body while its in stand mode. Its feet will generally remain still. However, Spot may adjust its feet to maintain balance if necessary.

BODY POSING

*Figure labels: Z · YAW · Y · PITCH · X · ROLL · L R · L L R R*

*Figure labels: BODY ELEVATION*

*Figure labels: ROLL*

*Figure labels: PITCH*

*Figure labels: YAW*

Y axis of left joystick moves

X axis of left joystick

Y axis of right joystick changes robot’s pitch (body angle)

X axis of right joystick yaws nose left and right

body flat up and down

rolls robot’s body

---

<!-- PDF page 37 -->

*Figure labels: WALKING · STATUS · BAR · | SPOT aa · LEFT RIGHT · JOYSTICK ACTION JOYSTICK · MENU*

## **CHANGING SPEED**

You can change Spot’s speed by selecting options from the action bar. Beginners should stay at Slow speed. High speeds affect Spot’s ability

Spot can walk in most places that a person can. Only walk Spot in a safe operating environments as outlined in this user guide.

1. On controller app, select Walk from **action menu** . If Spot is sitting, it will stand up.

## **CHANGING BODY HEIGHT**

2. Use **right joystick** to turn Spot. This is easiest when standing behind Spot.

Change Spot’s torso height with the controller in Pro mode. Changing height is useful for raising payload sensors to a greater height or to duck under obstacles. Spot will walk most stably when at 0 height (default). Other torso heights will degrade performance. to detect and avoid obstacles.

3. Use **left joystick** to move Spot’s body. It can move forward, backward, right, and left.

4. To stop movement, release fingers from **joysticks** .

---

<!-- PDF page 38 -->

# CHANGING GAITS

*Figure labels: OPERATION*

### **Demo: Mobility**

1. Put Spot into Stand mode.

2. Demonstrate body posing.

3. Discuss how posing body enables better sensor and arm range.

4. Put Spot into Walk mode.

5. Walk Spot around in front of audience, keeping it at least 2m away from all people.

6. Switch gaits and demonstrate to audience.

Spot has multiple locomotion gaits. Change gaits to suit operating conditions of a mission or demonstration. The controller commands Spot the same way regardless of gait.

### **To change gaits:**

1. Select “Walk” on action bar.

2. Select desired gait from pop-up menu.

||**GAIT**|**CHARACTERISTICS**|**BEST FOR**|
|---|---|---|---|
|**STANDARD**<br>**Operational**<br>**gait**|**Walk**|Dynamically stable<br>movement|Walking around|
|**MODE**|**Stairs**|Slows Spot’s speed and<br>pitches robot to better see<br>stairs while descending.|Climbing or<br>descending stairs|
||**Amble**|Stable gait where one foot<br>touches down at a time.|Walking on uneven<br>terrain<br>**Most stable!**|
|**DEMO**<br>**Demo gait**<br>**(less stable)**|**Hop**|Raises and lowers one front<br>and opposite hind foot<br>together for five counts|Mobility demos<br>**Less stable!**|
|**MODE**|**Jog**|Raises and lowers one front<br>and opposite hind<br>foot together|Mobility demos<br>**Less stable!**|

---

<!-- PDF page 39 -->

# NAVIGATING STAIRS

### **Spot can navigate stairs:**

1. Use controller to switch Spot to **stairs gait** .

2. Aim Spot up stairs.

3. Use left joystick to walk Spot up stairs, as if walking straight down hallway.

*Figure labels: _*

*Figure labels: OPERATION*

4. Always descend stairs with Spot in reverse. Always face Spot up the stairs.

CAUTION: Don’t stand under Spot. Spot could fall, damage itself and stairs, and pose risks to others.

*Figure labels: - :*

## **LIMITATIONS OF STAIRWAY NAVIGATION**

- Do not use on grated stairs, open-riser stairs, or partially transparent stairways.

- Spot can only climb or descend stairs while facing up.

- Do not turn Spot while on stairs.

- Use caution when turning on landings.

- Never stand under Spot.

- Use caution when operating Spot near open railings; Spot can fall through shafts.

- Spot cannot climb stairs by side-stepping.

---

<!-- PDF page 40 -->

# SPOT CAM PAYLOAD

Spot CAM is an optional payload that includes a 360<sup>o</sup> spherical camera, as well as the capability to broadcast audio or receive audio from two integrated microphones. An additional PTZ (pantilt-zoom) camera can be mounted on Spot CAM to enable detailed inspection tasks.

The Spot CAM payload significantly improves the robot’s image gathering capability and gives the operator better situational awareness as Spot moves through space.

Spot CAM is available in four different configurations: front-mounted or rear-mounted, with or without the PTZ camera. Spot CAM connects to the standard payload port on the Spot robot.

Front-mounted Spot CAM faces forward. Rear-mounted Spot CAM faces back and includes an integrated spacer between the spherical camera and the PTZ camera to give the camera a higher perspective when aimed forward.

### **Spot CAM includes:**

- One 360<sup>o</sup> camera that creates spherical panoramas

- One Pan-Tilt-Zoom or PTZ camera with 30x optical zoom (optional)

- Four pairs of LED lights

- Two speakers for broadcasting audio

- Two microphones for receiving audio

- A USB port for inserting a USB stick to save image data

*Figure labels: pes ee · aa Vo a_ · S cee ~ · Lo*

## **OPERATING SPOT CAM**

Spot CAM activates automatically when it’s connected to the robot, with the cameras displaying live images to the controller.

NOTE: To enable the PTZ camera, you may need to perform a one-time configuration step.

Switch between the on-board cameras, which show as grayscale video on the controller, and the Spot CAM cameras, which stream color video by tapping in the box on the top left of the controller.

The five pairs of stereo cameras on the base Spot platform remain operational when Spot CAM is installed.

---

<!-- PDF page 41 -->

*Figure labels: OPERATION*

*Figure labels: PTZ · le · CAMERA · Ud · LED PAIR · USB · SPEAKER · DUST CAP*

### **Operating the PTZ camera:**

Further control of Spot CAM includes the following.

The PTZ can be aimed horizontally and vertically with precision. The camera can be zoomed 30x to magnify distant objects or to inspect a nearby object such as a gauge or instrument panel in detail.

### **Turning on LEDs:**

Spot CAM includes 4 pairs of LED lights that provide an effective light source for the cameras. The LEDs point to each side of the robot and forward for a front-mounted Spot CAM.

To zoom the PTZ camera, use the zoom slider at the top right of the controller screen.

To turn on the LED lights, tap the lightbulb icon, top right on the controller screen.

PTZ camera range of motion:

- Pan range of motion: 170 degrees

Adjust the brightness of the LEDs in the Spot CAM settings: Main menu > Spot CAM Settings.

- Tilt range: -30 to 130 degrees

---

<!-- PDF page 42 -->

## **SAVING IMAGES TO USB STICK**

Spot CAM can save images to the Spot CAM USB stick provided by Boston Dynamics. Saving video is not supported.

The Spot CAM USB stick inserts into a USB port on the front of the Spot CAM unit, underneath a dust cap.

NOTE: You must insert the Spot CAM USB stick before powering up the robot.

Boston Dynamics supplies 256 GB USB 3.1 sticks for use with Spot CAM. The file system is Linux-based XFS.

Access to a linux system is required to pull data off the stick. Mounting the stick on a Windows or macOS computer is not supported.

NOTE: Consumer USB sticks are not supported.

**To save Spot CAM still images,** follow these steps:

1. Position Spot as needed to capture the images you want.

2. Tap the capture icon on the robot controller.

   - NOTE: Saving spherical images can take a few seconds. Robot control is not interrupted during image saving. You can move the robot as needed while this operation is in progress.

The Spot CAM USB stick can be encrypted to protect the images you capture.

### **To encrypt the USB stick:**

1. Open the robot’s admin console. The default address is: http://10.0.0.3 If you have changed the default IP address of the robot, enter the updated address instead.

2. Navigate to the Payloads page and scroll to the bottom section: Spot CAM

3. Enter the passphrase you want to use to encrypt the USB stick.

4. Reboot the robot.

5. Store the passphrase securely. You will need it to decrypt the USB stick to view the Spot CAM image data.

---

<!-- PDF page 43 -->

**To decrypt Spot CAM image data,** mount the USB stick on a Linux system.

The exact method you use to decrypt the USB stick may vary depending on which Linux distro you are using. Example decryption script for Ubuntu:

#! /bin/bash # Decrypt images from a Spot CAM payload # Saves them to ~/imagelog sudo umount ~/imagelog || true # the usb stick from Spot CAM appears at /media/$USER/imagelog # the images are in the data folder FOLDER ~~=~~ ”/media/$USER/imagelog/data” PASSPHRASE ~~=~~ $1 if [ ~~-~~ z “$PASSPHRASE” ]; then echo “Usage: ./decrypt_images.sh <passphrase>” fi # hash the passphrase using the same algorithm that the webserver uses HASHED ~~=~~ $(python ~~-~~ c “import hashlib, binascii; print(binascii.hexlify(hashlib.pbkdf2_ hmac(‘sha256’, b’${PASSPHRASE}’, ‘spotcamsalt’, 100100)))”) PWSIG ~~=~~ $(printf “%s” “${HASHED}” | ecryptfs ~~-~~ add ~~-~~ passphrase | sed ~~-~~ ne ‘s/.*\[\ (.*\)\].*/\1/p’) keyctl link @u @s # mount the encrypted folder sudo mount ~~-~~ i ~~-~~ t ecryptfs “${FOLDER}” ~/imagelog ~~-~~ o ecryptfs_sig ~~=~~ ${PWSIG},ecryptfs_ fnek_sig ~~=~~ ${PWSIG},ecryptfs_cipher ~~=~~ aes,ecryptfs_key_bytes ~~=~~ 32,ecryptfs_passthrough

---

<!-- PDF page 44 -->

## **BROADCASTING AUDIO**

Spot CAM includes two integrated speakers that allow you to play audio recordings, such as an announcement or a warning tone for bystanders while operating the robot.

You can also speak into the controller to broadcast your voice from the robot.

Spot CAM currently supports the WAV audio file format with a RIFF wrapper.

To upload the audio files you want to broadcast to the robot controller you can use any of a number of file share services such as Google Drive, or Dropbox to copy files onto the controller.

You can also connect a USB cable to the controller or use a microSD card to transfer audio files.

On the controller, WAV audio files are stored in: Internal Storage > Documents > bosdyn > audio

### **To upload audio files:**

1. Open the Files app on the Spot controller.

2. Open the Internal Storage > Documents > bosdyn > audio folder.

3. Upload your audio files to the audio folder.

Options for audio file playback appear on the controller.

On the controller, you can choose a file to play once or continuously at 30 second intervals until you stop playback.

### **To play an audio file:**

1. With the robot activated, use the controller to select the audio file you want to play.

2. Choose the playback option you want: play once or continuous play.

3. Adjust output volume as needed using the slider control.

The robot will broadcast the audio file you chose.

### **To broadcast your voice:**

1. Tap and hold the microphone icon on the controller.

2. Speak into the controller’s condenser microphone.

3. Release the microphone icon to stop.

---

<!-- PDF page 45 -->

## **TROUBLESHOOTING SPOT CAM**

If you are having trouble operating Spot CAM or saving images, review the following information for solutions to common problems.

### **Images can’t be saved**

Symptom: No option to capture image. Possible causes:

- The Spot CAM USB stick was not inserted into Spot CAM before the robot was powered on

- An unsupported USB stick is being used in Spot CAM

Solutions:

- Confirm that a supported Spot CAM USB stick is being used

- Insert Spot CAM USB stick port before powering on the robot

### **Poor video quality related to network signal strength**

Symptoms: Blurry focus or other problems.

Possible causes: Weak wifi signal.

Solution: Improve the strength of the wifi signal by extending its signal range and quality, by changing to a less congested channel, or by operating the robot within the available signal range.

The quality of the live video you see on the robot controller is determined by the strength and quality of the wifi network being used by the robot. Get help from your network administrator, if needed, to optimize network bandwidth.

### **Poor video quality on the robot controller after a fall**

Symptoms: The PTZ camera feed viewed on the robot controller is blurry following a hard fall by the robot.

Possible causes: A hard fall can cause the PTZ to go out of calibration.

Solution: Power cycle the PTZ camera using the robot controller.

### **The PTZ camera is frozen**

Symptoms: The PTZ camera doesn’t respond to requests to point, tilt, or zoom.

Possible causes: The robot experienced a hard fall. Other causes are possible.

Solution: Power cycle the PTZ using the robot controller.

### **The volume level is too low when playing an audio file**

Symptoms: The output volume when playing an audio file is lower than expected or desired.

Possible causes:

- The output volume on the robot controller is set too low.

- The audio file was recorded at a low volume level.

Solutions:

- Raise the volume using the robot controller.

- If the audio file was recorded at a low volume level, rerecord or edit the audio file to increase the volume level.

If there isn’t any audio output at all, check that the correct audio file format (WAV) is being used.

---

<!-- PDF page 46 -->

# TELEOPERATION

Teleoperation allows operation of Spot beyond line of sight by displaying images from Spot’s cameras on the controller.

## **RANGE**

Spot’s teleoperation range depends on communication and network configurations. If the controller is directly paired to Spot’s WiFi access point, maximum range is typically 50 m. However, walls will affect this range, as will wireless network interference and other devices.

Placing Spot and the controller on a shared wireless network or using mesh radio or LTE payloads will enable longer-range teleoperation.

When Spot loses communication, it will sit down and turn off motor power.

## **SWITCH TO TELEOPERATION MODE**

Press button labeled “Turn on Cameras” in top left corner; operator now sees what Spot sees in teleoperation mode.

## **CHANGING CAMERA VIEWS**

Teleoperation primarily uses Spot’s forwardfacing stereo cameras. Use the D-pad or onscreen arrows to view side or rear camera footage.

## **DRIVE WITH JOYSTICKS**

Joysticks and other operating features still function in teleoperation mode.

## **TOUCH TO GO**

Touch to go lets you drive Spot to a specified location by touching the desired position on the camera image displayed on the controller screen.

- While in teleoperation mode, touch desired location on controller screen to make Spot go to location.

- Spot will go to location on ground plane; uneven terrain can cause it to overshoot or undershoot.

- Select X or B button to stop robot.

- Touch to go functions in various camera views. Choosing a location in Spot’s rear camera will direct the robot backwards to that location.

---

<!-- PDF page 47 -->

## **NAVIGATION**

# AUTOWALK

Spot’s Autowalk feature enables you to record and replay autonomous behaviors with Spot. Autowalk consists of two parts:

- **Recording missions:** Drive Spot through a route and choose actions for the robot to complete at points along the way.

- **Replaying missions:** At the click of a button, Spot will execute the movements and actions as recorded, while adapting to minor changes in the environment.

## **MISSIONS**

A mission defines Spot’s movements and location-based actions in the environment. Missions can be used to automate repetitive tasks with Spot.

Spot tracks its position as it walks through the environment during mission recording. Spot will follow the same path during mission replay. If the environment changes between recording and replay, Spot will adapt its route to avoid obstacles and attempt to complete the mission.

Actions at specific locations can be added to the mission, to be executed when the mission is replayed.

Missions are recorded on Spot and are transferred to the robot controller when saved.

Spot compares data from its sensors with saved data in the recorded mission to autonomously navigate through the environment during mission replay. Mission replay relies on at least one navigation fiducial and multiple waypoints defining the robot’s path.

## **FIDUCIALS**

Fiducials are specially designed images similar to QR codes that Spot uses to match its internal map to the world around it.

Fiducials are required:

- At the beginning of every mission

- In “feature desert” areas where there is not enough information for Spot’s sensors to determine its location in the environment

Spot recognizes AprilTag fiducials that meet the following requirements:

- Tag36h11 set, in the range 200-399

- Image size: 146mm square

- Printed on white non-glossy US-letter size sheets NOTE: Spot recognizes fiducials of all sizes, but is calibrated to fiducials that are 146mm squares. Using fiducials that are not 146mm squares will cause Spot to perform poorly.

More information on AprilTags can be found at the University of Michigan April Robotics Lab:

<u>https://april.eecs.umich.edu/software/apriltag</u>

---

<!-- PDF page 48 -->

## **ACTIONS**

Actions are triggered when Spot reaches specific locations in the environment.

## **WAYPOINTS**

Spot automatically places navigation waypoints along its path during mission recording. It walks from waypoint to waypoint during mission replay.

Waypoints are automatically placed:

- At 2m intervals along straight paths

- When either event occurs within a 0.3m path segment:

   - Spot turns more than 30 degrees

   - Spot’s elevation changes more than 0.3m

   - A mission action is recorded.

The base Spot platform tracks visual features within 2m of the robot with its stereo cameras. If Spot is outfitted with a LIDAR, it can track features within that sensor’s range, typically over 50m. The added sensing range of LIDAR enables Spot to travel farther from features and through more dynamic environments.

During mission replay, Spot calculates its position by comparing features in its current sensor data with features in the data snapshots taken at each waypoint during mission recording. Spot automatically compensates for deviations in its path and small changes in the environment, but large discrepancies may require operator intervention.

**Image capture actions** can be used to take spherical photos with the optional Spot CAM payload. These actions are useful for documenting work progress on a jobsite and for performing operator rounds and readings in industrial facilities.

**API callback actions** (coming in early 2020) are used to run third party code at specific locations in the environment. Client code can run on a Spot payload or on an external device connected to the robot over the network.

API callback actions are useful for developers who are integrating custom payloads such as laser scanners or other sensors.

## **LIMITATIONS**

Autowalk is designed to be used under operator supervision. Be prepared to stop mission execution at any time.

### **CAUTION: Do not use Autowalk:**

- On stairs

- On elevated platforms

- In areas with open holes, cliffs, or fall hazards

- Around people other than the operator. Autowalk is intended to be used after-hours in areas away from people.

- In dynamic environments where significant change is expected between mission recording and replay.

---

<!-- PDF page 49 -->

## **PLACING FIDUCIALS**

When placing fiducials, **be sure to:**

- Place one at the mission’s starting location.

- Tape fiducials flat against a vertical wall, as securely as possible. If fiducials move after recording, the mission may no longer replay.

- Place them low on the wall. The top of the fiducial image should be at human knee height, 45-60cm (18-24”) above the ground.

- Place them in a permanent location where they will persist for as long as you plan to replay the mission.

## **AUTOWALK SETUP**

Before using Autowalk for the first time, make sure to follow these guidelines:

1. Plan the route Spot should follow through the space and decide where you would like to record mission actions. Remove obstacles that could interfere with Spot during replay.

   - A good mission path:

   - Is free of obstacles.

   - Is through an environment that is unlikely to change significantly between recording and replay.

   - Has features Spot can identify within sensing range (2m if using the base platform).

2. Place a fiducial at the mission’s starting location and anywhere on the mission route where there is not enough information for Spot to determine its position (such as long white walls).

- Place them in areas which are feature deserts, for example a span of over 3m of featureless white wall.

When placing fiducials, **avoid the following:**

- Repeating the same fiducial multiple times in a single mission. Each fiducial in a mission must be unique, however the same fiducial can be used in multiple missions.

- Placing fiducials in areas with inconsistent lighting. Shadowed or unevenly lit fiducials can have unreliable detections.

- Placing fiducials so that they are backlit by a bright background, such as on a window.

- Placing fiducials where they will be blocked, damaged, moved, or removed. NOTE: Areas with intersecting walls, corners, furniture, equipment, and other visually distinguishing features do not typically require a fiducial (unless the mission starts in that location). Using a LIDAR payload for navigation will reduce the number of fiducials required.

---

<!-- PDF page 50 -->

## **ADDING ACTIONS TO A MISSION**

If a Spot CAM payload is attached, you can add an image capture action to the mission.

## **RECORDING A MISSION**

1. Move Spot within sight of the starting fiducial and use the robot’s platform cameras to ensure it can see the fiducial. All missions must start at a fiducial.

2. Tap the Settings menu icon and choose Autowalk > Record new mission.

3. Give the mission a meaningful name to help distinguish it from other missions. By default, mission names are based on the date and time of creation.

4. Tap “Start Recording” to start the recording process. From this point forward, every movement you make with Spot, and every action you add to the mission, will be recorded. The mission will be played back exactly as recorded during mission replay.

   - CAUTION: When recording (or replaying) a mission, maintain the 2m safety distance from Spot. Not only is following closely behind the robot dangerous, but you may inadvertently block sensor data from being recorded or interfere with the robot’s sensors during mission playback.

5. Drive Spot on your desired route through the environment by using the controller joysticks or Touch-to-go.

6. Use the + on the controller screen to add actions to Spot’s current location. Select which action you would like to perform and (optionally) give the action an identifying name. Actions will be triggered at this location during mission replay.

7. When you reach the end of the route, stop recording and save the mission to the controller by tapping the download arrow.

### **To capture an image:**

1. Tap the PTZ or 360 button on the controller to choose which camera to use: the 360<sup>o</sup> camera or the PTZ camera.

2. Tap the camera icon. The captured image will be saved to the Spot CAM USB stick.

### **To generate an API callback:**

(Coming in early 2020.) This action activates third party code using a UserResponse mission node, keyed to the action’s identifying name. For example, if you create an API callback named myFirstCallback, your code should monitor the mission for a mission question with the name “myFirstCallback.”

## **DELETING A MISSION**

While mission files are generally small in size, the list of missions to choose from can quickly become long. You can delete mission data on the controller in one of two ways, as follows.

### **To delete a mission in the Spot app:**

1. Navigate to the Playback Mission page in the Spot app.

2. Tap and drag the mission you want to delete to the left.

**To delete mission files using the controller Files app:**

1. Open the Files app on the controller and navigate to: Internal Storage > Documents > bosdyn > autowalk.

2. Select and delete the applicable folder to remove the mission from the controller.

---

<!-- PDF page 51 -->

## **REPLAYING A MISSION**

Recorded missions are stored on the robot controller. You can connect a controller containing recorded missions to any Spot in your fleet and replay the mission with any of your robots.

### **To replay a mission:**

1. Open the Settings menu on the controller and tap to select Autowalk > Replay Mission.

2. Select the mission you want to replay.

3. The mission loads into memory. Large missions may take several seconds to load.

4. Localize the robot to the start point fiducial and tap “Initialize Mission.”

5. The robot carries out the mission, following the mission route to its end point.

**To pause mission replay,** tap the pause button. Resume by tapping the play button.

## **MONITORING A MISSION**

The operator must monitor all missions by connecting the controller to the robot as an observer. This allows the operator to receive the robot’s video stream on the controller.

CAUTION: Spot should be supervised during Autowalk mission execution. The robot operator is responsible for the safe operation of the robot whether manually driving the robot or in replaying a defined mission. The robot and its surroundings must be carefully monitored to avoid dangerous situations. The controller must be continuously connected to the robot during operation.

## **SKIPPING PART OF A MISSION**

During mission replay, the operator may choose to skip part of a mission. This feature can be helpful when trying to run a mission where an obstacle prevents the robot from reaching a waypoint associated with a recorded action.

For example: During mission replay you discover that a forklift has been parked on top of a waypoint where an image capture action has been recorded.

**To skip part of a mission** if an obstacle is blocking a waypoint:

1. When the controller promts you to skip part of the mission, click the skip button to take manual control of the robot.

2. Walk the robot past the blocked waypoint.

3. Press “Resume” to skip the waypoint and continue the mission.

---

<!-- PDF page 52 -->

### **The option to start recording a mission doesn’t appear on the controller**

Symptom: When attempting to record a new mission, the controller doesn’t offer an option to start the recording process.

## **TROUBLESHOOTING AUTOWALK**

If you have trouble recording, saving, or replaying Autowalk missions, review the following information for solutions to common problems.

### **The robot is stuck**

Symptom: Spot keeps trying unsuccessfully to find a path around an obstacle.

Possible causes: Spot becomes stuck when it encounters an obstacle that it can’t navigate around in a mission. For example: a wall was constructed across the mission path after it was recorded, or a piece of equipment was moved into the path.

Solution: Take control of Spot, using the controller to navigate it around the obstacle and resume or abort the mission.

If the robot is manually navigated past an actionable mission item, a “Skip Part of the Mission” button appears on the controller, which must be used to circumvent inaccessible mission actions.

### **The robot is lost**

Symptom: Spot declares itself lost, sits and powers down its motors, and asks the operator to intervene.

Possible causes: The recorded mission is outof-date. Spot declares itself lost when it detects a significant difference between its perceived location and its apparent location on the mission route. On the controller, this may look as if the mission is veering away from the intended route.

Solution: Re-record the mission.

Possible causes: No fiducial visible to the robot. To start recording a mission, the robot needs to localize to a fiducial as a start point reference.

Solution: Localize the robot by moving it close to a fiducial. When the robot sees the fiducial, the controller will present the option to start recording.

### **Mission recording stops suddenly**

Symptom: The comms icon on the controller flashes yellow or red and the robot stops.

Possible causes: The robot’s connection to the controller has been lost because of network instability, weak battery, or other factors.

Solution: Resolve the communications issue, recharge batteries.

### **When trying to select a mission, no missions are offered.**

Symptom: When selecting a mission to play back, no missions are presented and the replay fails.

Possible causes: When recording a mission, if the process is not ended by saving and downloading the mission, no mission will be presented to the operator to replay.

Solution: Be sure to save the mission on completion. Re-record the mission and finish the mission download and save process to completion.

NOTE: Delete incomplete missions from your controller so they no longer appear in the list of missions to replay. See “Deleting a Mission” on page 42 for more information.

---

<!-- PDF page 53 -->

### **The robot stops and sits down during replay**

Symptom: During mission replay, the robot stops, sits, and powers down motors.

Possible causes:

### **Robot fails to replay a mission**

- The robot is lost

- The robot has lost connection to the controller

- The robot battery is nearly drained

- The controller battery has drained.

Solutions:

- Relocalize the robot to a fiducial on the mission.

- Recharge the controller battery using a standard micro-USB cable.

- Recharge or replace the robot battery with a fully charged battery and resume or restart mission playback.

- Move the controller closer to Spot.

### **The robot stops during mission replay**

Symptom: The robot has lost its localization.

Possible causes: Something has changed in the recorded mission environment — a fiducial was replaced, moved, or removed, for example, or the environment has changed significantly since the mission was recorded (moved equipment, new construction, etc.).

Solution: Relocalize the robot to a fiducial on the mission.

Symptom: The robot starts but doesn’t complete a mission.

Possible causes: Robots may not successfully follow a mission if the mission space has changed significantly since the mission was recorded.

Solution: Clear the mission route of large obstacles. Re-record the mission, if necessary.

### **Incompatible constraints error message**

Symptom: This error message appears on the robot controller when attempting to replay a recorded mission.

Possible causes: A mission was recorded during which the robot did not have enough room to turn around backwards before traversing down a ramp or a step. The mission recording completed but on replay the error message appears.

Solution: Tap “Continue” to continue the mission. Tap “Abort” to halt the mission replay. Re-record the mission, checking to make sure the robot has enough space to turn around before descending.

CAUTION: Continuing the mission will cause the robot to descend steps facing forwards, increasing the risk of the robot falling.

---

<!-- PDF page 54 -->

# SHIPPING

## **ROBOT**

To ship Spot, remove the battery and load Spot and the controller into the case.

## **BATTERY**

# TURNING SPOT OFF

1. Walk Spot to charging, storing, or transport location. Walk Spot instead of carrying it whenever possible.

2. Sit Spot.

3. Power off motors with controller.

4. Engage lockout button.

5. Power off robot by pressing and holding blue button at Spot’s rear for two seconds.

6. Select controller’s Disconnect option.

7. Take battery to charger or plug robot into power source.

The Spot Battery is considered Fully Regulated Dangerous Goods by the International Air Transport Association (IATA). Air shipment of any Spot Battery is subject to UN3480 - PI965, Section IA, which is covered under IATA regulations (https:// <u>www.iata.org/).</u>

### **It is your responsibility to ensure compliance**

**with these requirements** when shipping any Spot battery. Always check the full regulations and carrier requirements before shipping.

### **Notable requirements include:**

- Batteries must be properly packed in a UN-approved container, labeled, and declared according to IATA Dangerous Goods Regulations.

- The battery state of charge must be =< 30% of rated capacity.

- The weight limit per container is 35 kg.

- The battery may be shipped by cargo aircraft only.

- The shipment must be signed by a person certified in accordance with IATA Dangerous Goods Regulations.

---

<!-- PDF page 55 -->

*Figure labels: SYSTEM ADMIN*

# DEFAULTS

Spot’s default usernames and passwords are stored in the battery compartment. Photograph or hand-write here:

WiFi SSID: ______________________

Password: __________________

Admin Username: ________________

Password: ________________

User Username: __________________

Password: __________________

# ADMIN PAGE

Spot hosts a web page, the WebUI, for system administration tasks, such as updating robot software, accessing logs, modifying network settings, and administering users.

## **CONNECTING TO THE WEBUI**

### **Wired Connection**

A wired connection should be used for updating robot software, accessing logs, and modifying network settings.

NOTE: These instructions only apply if the robot’s default wired network settings have not been changed.

1. Connect ethernet cable from Spot to a computer.

2. Manually set computer IP address. Spot’s default requirements for computer IP address is in range of 10.0.0.* (For example, 10.0.0.100).

NOTE: Spot, by default, occupies IP address 10.0.0.3. Do not use this for laptop.

3. Apply settings.

4. Use web browser to navigate to Spot’s static IP address. The factory default address is: **https://10.0.0.3**

5. The robot login webpage should appear. If it does not, check the laptop’s network settings before contacting support.

6. Log in with default username and password.

---

<!-- PDF page 56 -->

# NETWORK SETUP

### **Wireless Connection**

A computer can be connected directly to the robot’s WiFi access point. To connect to a robot that has **default factory settings** , follow these instructions:

1. Join Spot’s hosted WiFi network.

2. The robot WiFi network will automatically assign the computer an IP address. Make sure the computer is configured to use DHCP for this WiFi network.

3. Use a web browser to navigate to Spot’s IP address: https://192.168.80.3

4. The robot login webpage should appear. If it does not, check the computer’s network settings before contacting support.

5. Log in with the default username and password.

The WebUI can be used to configure Spot’s network:

**Wired:** Spot can connect to a wired network through ethernet. Change default settings as needed to allow Spot to operate on an existing wired network.

**Hosted WiFi (default):** Spot broadcasts its own wireless network. Best for short distances between the controller (or control computer) and robot.

**Shared WiFi:** Spot can join an existing wireless network such as the company network.

NOTE: Operators are responsible for Spot’s network security. Place Spot behind a firewall, preferably on a private network.

---

<!-- PDF page 57 -->

## **CONNECTING SPOT TO A SHARED WIFI NETWORK (ADVANCED)**

NOTE: Settings in advanced sections should be modified by users with experience in networking and system administration.

This is useful for joining company or site-specific WiFi network. For example, to operate Spot around a large office building. If using controller to operate robot on shared WiFi network, be sure to also configure controller to join that network.

### **On a computer:**

1. Connect to WebUI over ethernet.

2. Go to network pane.

3. Switch robot to “client” mode.

4. Enter network name and password for the desired network.

5. Enter desired static IP address for robot. IP address must be valid on the network.

6. Apply settings.

7. A green confirmation box at top of page should appear indicating that settings have applied.

8. Spot’s WiFi access point will no longer be available.

### **On the controller:**

1. On “select network” screen, join desired WiFi network.

2. Click “add robot by IP address” and enter robot’s static IP address.

## **SWITCHING TO HOSTED WIFI (ADVANCED)**

This is necessary if you have modified the robot’s settings to join a shared WiFi network and now want to change it back to broadcasting an access point. This is useful if operating a robot away from the company network.

### **On a computer:**

1. Connect to the WebUI.

2. Go to network pane.

3. Switch the robot to “Access Point” mode.

4. Apply settings.

### **On the controller:**

On “select network” screen, join Spot’s hosted WiFi network.

---

<!-- PDF page 58 -->

ADMIN TASKS

The admin has the responsibility of changing the robot’s passwords, updating software, and managing the user accounts associated with the robot.

## **PERMISSIONS**

## **ADDING ADDITIONAL USERS**

Each operator should have his or her own account. Accounts can be managed through the WebUI. All operators must read and understand this guide.

ABOUT PAGE

**User:** A user can drive the robot.

**Admin:** An admin has all user rights and can also update software and modify the users associated with the robot.

## **CHANGING DEFAULT PASSWORDS**

Spot ships with default passwords for admin and user accounts. Change these passwords during robot setup.

The About page describes the robot and software. It provides information which is useful when contacting support.

## **SET ROBOT NICKNAME**

Give Spot a name which will be displayed on the WebUI login page and help distinguish the robot in other applications.

---

<!-- PDF page 59 -->

# LOG DOWNLOADS

# REPORTING BUGS

Reporting bugs helps Boston Dynamics improve Spot. Log bugs in the settings menu on the controller.

Bugs reported on the controller will not be automatically transmitted to Boston Dynamics. They are logged on Spot and must be downloaded from the robot and manually transmitted.

Contact **support@bostondynamics.com** to initiate a bug report.

Spot records sensor and program data logs while operating. Logs help diagnose bugs and support feature development. If required by support, please download these logs and upload them to Boston Dynamics, using the following steps:

1. Use WebUI to download log files to a computer. Encrypted logs can be large; download them via wired Ethernet.

2. Delete downloaded logs from Spot to make space for new ones. If desired, lock log files to prevent deletion.

3. Contact BD support representative for secure upload link.

---

<!-- PDF page 60 -->

# INSPECTION

Inspect Spot before use. If noticable issues, contact **support@bostondynamics.com** .

- Inspect camera windows for cracks or any obstruction that could occlude lenses (ex: tape or debris).

- Inspect robot for broken plastic pieces, especially the yellow crash protection.

- Check that robot’s fans spin quietly.

- Check for loose fasteners or other items. Head and tail frame mountings should be rigid.

- Inspect foot tread. If tread is worn, surface will be smooth. New treads have firm ridges.

- Check that visible structural components appear intact (lower and upper leg solid, no fractures, etc.).

- When powered on and standing or walking, Spot’s body should be parallel to ground.

# CLEANING

Use mild detergent to clean Spot. Do not use strong solvents.

NOTE: Do not submerge Spot. Spot is resistant to light sprays of water but should not be sprayed with water jets or submerged in water. Submerging Spot will permanently damage the robot.

*Figure labels: f*

*Figure labels: 9) 'S)*

**52** ~~_~~

---

<!-- PDF page 61 -->

# RECALIBRATING SPOT

## **ABOUT SPOTCHECK**

SpotCheck is a feature that improves Spot’s mobility with joint and vision calibration. SpotCheck can resolve problems with the robot’s gait, such as stumbling on stairs or limping, by evaluating current settings and recalibrating, if needed.

Robot falls and ordinary usage over time can cause the robot’s onboard cameras to lose calibration. If the robot starts running into obstacles that it had previously avoided, SpotCheck can evaluate and resolve camera calibration issues to restore perception accuracy.

SpotCheck offers two modes: a joint calibration and camera check and a camera calibration.

### **Joint calibration and camera check:**

- Tests and recalibrates (as needed):

   - Load cell sensor for hip and knee joints

   - Joint position sensor for hip and knee

- Performs basic check (not calibration) of all onboard cameras, excluding Spot CAM, if installed.

### **Camera calibration:**

- Determines if stereo intrinsics or extrinsics are out of calibration.

- Requires the use of the calibration panel shipped with the robot.

## **WHEN TO RUN SPOTCHECK**

If you notice any of the following, that may be a sign that the joints and/or camera has fallen out of callibration:

- The robot limps or stumbles more than usual.

- The robot runs into obstacles it has successfully avoided in the past.

- The robot has more difficulty on stairs than usual.

To return robot to normal operation, run SpotCheck.

---

<!-- PDF page 62 -->

## **JOINT CALIBRATION AND CAMERA CHECK**

### **To prepare for the callibration process:**

- Put Spot in the sit position on a flat manufactured surface with at least 1.5 m of clearance all around. Level ground is essential.

- Avoid sitting the robot on surfaces that are very shiny or transparent, as well as matte black floors that absorb IR light.

- Ensure that all of the robot’s feet are in contact with the same kind of surface.

- With the exception of attached and configured payloads, ensure nothing is resting or lying on top of the robot.

- Confirm the robot’s payload configuration information is correct.

The joint calibration and camera check process takes a few minutes to complete. **To start the calibration process:**

1. Make sure the robot is placed according to the above guidelines.

2. Tap SpotCheck on the controller Settings menu.

3. Tap “Joint Calibration & Camera Check” to start the process.

4. When the process is complete, view the load cell and joint offset calibration settings and results of the camera check test.

Setup errors during SpotCheck could cause mis-calibration. If Spot’s mobility is still impaired after running SpotCheck, you can follow the preparation guidelines and redo the calibration or revert to the previous joint calibration.

**To revert to the previous calibration,** click the “Revert” button on the SpotCheck panel.

NOTE: Only the last calibration settings are saved. If you run SpotCheck in quick succession you may not have a good recalibration to revert to. After a calibration, if you notice that the robot’s performance has degraded, either revert to the previous calibration or run SpotCheck again.

---

<!-- PDF page 63 -->

### **To prepare for the callibration process:**

## **CAMERA CALIBRATION**

The camera calibration process tests and recalibrates the robot’s cameras. The process takes about 15 minutes as the robot cycles through a variety of poses, moving side-to-side and forward-and-back as needed.

The camera calibration process requires the use of the calibration panel shipped with the robot. The calibration panel is a flat panel approximately 118.5 cm x 50 cm that shows a set of 18 fiducials spaced evenly on a black background. The panel is used by the robot to calibrate its five onboard stereo cameras.

NOTE: Treat the panel with care. Folds, creases, or damage to the panel can cause the calibration operation to fail or produce unexpected results. Do not store or use the target in a way that would cause it to warp over time.

Before you run the recalibration operation, the calibration panel and the robot must be positioned correctly.

- Mount the calibration panel on a vertical surface, or lean it against a wall so that the panel is positioned within 5 degrees of vertical.

- Position the panel right-side-up with the bottom edge no more than 2 inches from the floor surface.

- Make sure that the panel is evenly and adequately lit for the duration of the calibration process (approx. 15 minutes).

- Stand Spot on a flat manufactured surface so that the rear faces the calibration panel at a distance of 1m with at least 1m of clearance all around. Level ground is essential.

- Avoid placing the robot on surfaces that are very shiny or transparent, as well as matte black floors that absorb IR light.

- Ensure that all of the robot’s feet are in contact with the same kind of surface.

- With the exception of attached and configured payloads, ensure nothing is resting or lying on top of the robot.

- Confirm the robot’s payload configuration information is correct.

---

<!-- PDF page 64 -->

**To revert to the previous calibration,** click the “Revert” button on the SpotCheck panel.

### **To start the camera calibration process:**

1. Make sure the robot and calibration panel are placed according to the above guidelines.

2. Tap SpotCheck on the controller Settings menu.

3. Tap Camera calibration to start the process.

4. After camera calibration is complete, run the joint calibration and camera check again to verify that the cameras are in working order.

NOTE: Only the last calibration settings are saved. If you run SpotCheck in quick succession you may not have a good recalibration to revert to. After a calibration, if you notice that the robot’s performance has degraded, either revert to the previous calibration or run SpotCheck again.

WARNING: If the camera check identifies onboard cameras that are not functioning, the robot might have difficulty navigating stairs, which could cause the robot to fall. For example, if camera check results show that the rear-facing camera is not functioning, do not to attempt to drive the robot down stairs until the camera issue is resolved.

---

<!-- PDF page 65 -->

*Figure labels: SERVICE & REPAIR*

# TROUBLE SHOOTING

Errors affecting Spot’s operation will be visible on the controller. Controller icons turn yellow for warnings and red when serious errors occur. The robot’s status lights will also flash orange to alert operators of any serious error.

To document errors, take a screenshot of the controller screen with the error dropdown menu selected.

## **TRY THIS FIRST**

The robot operator may be able to fix certain errors by turning the robot off and on again.

NOTE: When the robot is cold, some functions may not work. Let Spot warm up to room temperature for an hour and then power it on.

# CONTACT SUPPORT

If error persists after rebooting robot, robot needs maintenance, or other issues occur, contact robot support.

### Email: **support@bostondynamics.com**

### Include:

- Robot SN (located in battery compartment)

- Issue

- Repeatability of issue

## **STARTUP ISSUES**

### **Robot won’t turn on**

- Press battery’s SOC button to check battery level. If charge level is one or two bars (less than 40% charged), swap battery.

- If battery is too warm (due to charging or heavy use), robot won’t turn on, even when fully charged. Swap in cool, fully charged battery.

- Remove battery and put it back in.

### **Motors won’t turn on**

- Check if Spot‘s legs are tangled or at extreme angles, then adjust Spot to even seated position and try again.

- Turn robot off and on again.

**Perception won’t turn on**

# RETURN SHIPPING

If Spot needs to return to Boston Dynamics for repair, the company will send detailed shipping information. To ship Spot, follow instructions on page 33.

---

<!-- PDF page 66 -->

# SPOT SYSTEM

The Spot System includes the Spot robot, battery, charger, and operating control unit.

## **FCC COMPLIANCE**

The devices in the system comply with part 15 of the FCC Rules. Operation is subject to the following two conditions: (1) The devices may not cause harmful interference, and (2) the devices must accept any interference received, including interference that may cause undesired operation.

The Spot robot and charger have been tested and found to comply with the limits for a Class A digital device, pursuant to part 15 of the FCC Rules. These limits are designed to provide reasonable protection against harmful interference when the equipment is operated in a commercial environment.

The devices generate, use, and can radiate radio frequency energy and, if not installed and used in accordance with the instruction manual, may cause harmful interference to radio communications. Operation of these devices in a residential area is likely to cause harmful interference in which case the user will be required to correct the interference at his own expense.

CAUTION: The devices are not intended for use in residential environments and may not provide adequate protection to radio reception in such environments. Operation of these devices in a residential environment could cause frequency interference.

**SUPPLIER’S DECLARATION OF CONFORMITY (SDoC)**

**47 CFR § 2.1077 Compliance Information**

### **Unique Identifier**

Spot Robot, US Model #: 02-040236-001, Japan Model #: 02-040236-002 Contains radio module, FCC ID: 2ATBY-NMDB, Telec #210-130916 Spot Battery,  Model #: 02-036845-001 Charger, Model #02-044200-001 Operating Control Unit, Model #: S192K, FCC ID: 2ARQ6-S192

### **Responsible Party - U.S. Contact Information**

Boston Dynamics Inc. 78 4th Ave. Waltham, MA 02451

Telephone: 617.868.5600

### **FCC Compliance Statement**

The devices listed comply with part 15 of the FCC Rules. Operation is subject to the following two conditions: (1) The devices may not cause harmful interference, and (2) the devices must accept any interference received, including interference that may cause undesired operation.

---

<!-- PDF page 67 -->

# SPOT ROBOT

The Spot Robot is compliant with requirements under FCC Part 15B, CISPR 11 & CISPR 14.

## **RADIO**

The Spot Robot contains a certified radio module with the following certification identifications:

2ATBY-NMDB-2

210-130916

## **LASER**

The Spot robot contains 5 stereo camera systems that contain Class I laser projection system.

This product is classified as a Class 1 Laser Product under the EN/IEC 60825-1, Edition 2 (2007) and Edition 3 (2014).

*Figure labels: CLASS 1 LASER PRODUCT · EN/IEC 60825-1, 2014 (EU & other) · IEC 60825-1, 2007 (US)*

This device complies with US FDA performance standards for laser products except for deviations pursuant to Laser Notice No. 50 dated June 24, 2007.

US FDA Accession Number: 1910287-000

CAUTION: Tampering or adjustments to any of the laser components is not allowed and may result in hazardous radiation exposure. Use of controls or adjustments or performance of procedures other than those specified herein may also result in hazardous radiation exposure.

CAUTION: There are no service/ maintenance, modification, or disassembly procedures for the stereo module and infrared projector. The user must either notify System Integrators or return modules before any failure analysis is performed. Do not attempt to open any portion of this laser product and the camera assembly. Invisible laser radiation when opened. Avoid direct exposure to beam. There are no user serviceable parts with this laser product. Modification or service of the stereo module, specifically the infrared projector, may cause the emissions to exceed Class 1. No magnifying optical elements, such as eye loupes and magnifiers, are allowed.

---

<!-- PDF page 68 -->

# SPOT BATTERY

*Figure labels: COMPLIANCE*

The Spot Battery conforms to DENAN’s technical requirement.

CAUTION: Only for use in Boston Dynamics Spot Robot. Only charge with Spot Charger. DO NOT incinerate, disassemble, crush, or puncture. DO NOT short circuit. Damaged battery or short circuit may cause fire.

## **DISPOSAL**

Waste Electrical and Electronic Equipment (WEEE)

This symbol means that this product must not be disposed of with household waste. It is your responsibility to bring it to a designated collection point for the recycling of waste electrical and electronic equipment.

For more information, contact the local waste collection center or Boston Dynamics.

CAUTION: Each battery pack includes rechargeable lithium ion cells. Lithium is a highly reactive element which reacts violently when mixed with water, leading to possible battery leakage, smoke, and fire. Battery packs must be handled, stored and disposed of with care to prevent physical damage to the pack and to meet the environmental requirements specified.

# SPOT CHARGER

CAUTION: If the external flexible cable or cord of this transformer is damaged, it shall be replaced by the manufacturer or their service agent or a similarly qualified person in order to avoid a hazard.

The Spot Charger has passed conformance testing with a Registered Conformity Assessment Body

UL Japan

The Spot Charger is UL60950-1 & UL62368-1 compliant.

E487365

The Spot charger is for indoor use only.

The Spot charger is over voltage `II` category 2.

---

<!-- PDF page 69 -->

*Figure labels: SPECIFICATIONS*

|**CATEGORY**|**SPECIFICATION**|**VALUE**|
|---|---|---|
|**Dimensions**|Robot type|Spot Gamma|
||Length|1100 mm (43.3 in)|
||Width|500 mm (19.7 in)|
||Height (standing)|840 mm (33.1 in)|
||Height (sitting)|191 mm (7.5 in)|
||Net Weight|32.5 kg (71.7 lbs)|
||Degrees of freedom|12|
||Maximum speed|1.6 m/s|
|**Environment**|Ingress protection|IP54|
||Operating temperature|-20C to 45C|
||Slopes|+/- 30 degrees|
||Stairways|Stair dimensions that meet US building code<br>standards, typically with 7” rise for 10-11” run|
||Max step size|300 mm (11.8 in)|
||Lighting|Above 2 lux|

---

<!-- PDF page 70 -->

*Figure labels: SPECIFICATIONS*

|**Power**|Battery capacity|605 Wh|
|---|---|---|
||Max battery voltage|58.8V|
||Typical runtime|90 minutes|
||Standby time|180 minutes|
||Charger power|400W|
||Max charge current|7A|
||Time to charge|120 minutes|
||Battery weight|4.2 kg (9.3 lbs)|
|**Payload**|Max weight|14 kg (30.9 lbs)|
||Max power per port|150W|
||Payload ports|2|
||T-slot rail bolt size|M5 x 1.0|
|**Sensing**|Camera type|Projected stereo|
||Field of view|360 degrees|
||Operating range|4 m (13 ft)|
|**Connectivity**|802.11||
||Ethernet|1000Base-T|

---

<!-- PDF page 71 -->

_(This page contains only images/diagrams.)_

---

<!-- PDF page 72 -->

_(This page contains only images/diagrams.)_
