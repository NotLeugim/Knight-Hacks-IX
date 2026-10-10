# Spot User Guide - 24-30

> Markdown copy of `Spot User Guide - 24-30.pdf` (Boston Dynamics Spot User Guide, Release 1.1). Text extracted automatically; figures and diagrams are not included (their text labels are listed as *Figure labels*). See the PDF for images.


---

<!-- PDF page 24 -->

*Figure labels: ROLLING · SPOT*

*Figure labels: HANDLING SPOT*

CAUTION: Always use Spot’s handles when rolling the robot. Motors must be in lockout mode.

## **ROLLING SPOT ONTO ITS BACK**

*Figure labels: CY)*

      3.  Grab farthest front and rear hip handles.

   2.  Ensure that there’s empty space to the other side.

1. Stand to one side of Spot. Make sure motors are locked out.

*Figure labels: Q*

*Figure labels: Si*

*Figure labels: J*

4.  Close fists to avoid pinch points.

5.  Lifting handles, roll Spot closer while moving backward.

*Figure labels: 6. Keep hands in a · fist as Spot rolls.*

---

<!-- PDF page 25 -->

*Figure labels: HANDLING SPOT*

## **ROLLING SPOT INTO AN UPRIGHT POSITION**

CAUTION: Always use Spot’s handles when rolling the robot. Motors must be in lockout mode.

Spot can self-right on flat surfaces. Whenever possible, use the automated self-right procedure described on page 26.

*Figure labels: c\ · tl Q yy*

*Figure labels: in9 p*

*Figure labels: merone*

      3.  Grab farthest front and rear hip handles.

   2.  Ensure that there’s empty space to the other side.

1. Stand to one side of Spot. Make sure motors are locked out.

*Figure labels: N · ZO*

*Figure labels: garg*

*Figure labels: pail · E*

4.  Close fists to avoid pinch points.

   6.  Keep hands in a fist as Spot rolls.

5.  Lifting handles, roll Spot closer and move backward.

---

<!-- PDF page 26 -->

## **BATTERY LIFE**

Spot’s battery provides power for about 90 minutes of normal operation and about four hours in standby (sit) mode. Payloads, high activity and computation levels, and low temperatures can reduce this runtime.

# BATTERY POWER

The battery should be removed from Spot if it will be unused for 72 hours or more.

## **INSERTING THE BATTERY**

Spot is powered by a removable lithium-ion battery pack. The battery can be charged standalone or while inside the robot.

CAUTION: To reduce the risk of electric shock and fire:

- Only use Boston Dynamics approved charger

- Use properly grounded outlet. Do not use ground adapters or replace plug.

- Do not touch uninsulated parts of output connector or battery terminals.

- Do not open or disassemble charger.

- Do not use if AC cord is damaged.

## **DETERMINING THE BATTERY LEVEL**

The SOC button on the battery illuminates LEDs to show the battery level (state of charge).

Spot’s controller shows the battery level in the Boston Dynamics app. The battery icon is in the info bar at the top of the screen.

NOTE: Before inserting battery, document the information on robot label in battery compartment by taking a photo or recording on page 33. This information is needed to connect Spot to network.

With Spot on its back, slide the battery’s nonhandle side into the rear of Spot’s battery compartment; latch the handle. Ensure the battery is properly latched.

*Figure labels: NN . x 4 · RO, \\*

---

<!-- PDF page 27 -->

### **SHORE POWER CABLE**

*Figure labels: POWER · CABLE · BATTERY CHARGING · CABLE · CG*

## **CHARGING SYSTEM**

### **The charger comes with three cables:**

- Power Cable: From charger to wall (AC)

- Shore Power Cable: From charger to Spot

- Battery Charging Cable: From charger to battery

---

<!-- PDF page 28 -->

## **CHARGER OPERATING ENVIRONMENT**

### **Charging a standalone battery**

Use the battery charging cable to connect the charger to a standalone battery.

The charger light will blink green while the battery is being charged and switch to solid green when the battery is fully charged.

### **Charging a battery in Spot**

Use the shore power cable to connect the charger to the robot and charge a battery in Spot.

Carefully insert the charging cable into the charging port at the back of Spot shown on page 5.

The battery will begin charging regardless of whether Spot’s computers are powered on or off.

The motors will not turn on while the power cable is inserted.

NOTE: The cable only inserts one way, indicated with a white dot on the connector. Make sure the white dot faces down. Don’t force the connector; inserting it at an off-angle can damage it.

Operating temperature: 0C to 40C

Input: 100-240 VAC, frequency 50/60Hz, Current 5.5A Max

Charge time: 2.5 hours

Output: 35-58.6 VDC, 7.2 A Max

## **HOT-SWAPPING THE BATTERY**

Hot-swapping is a way to exchange batteries without rebooting the robot’s computers. To hotswap:

1. Connect the shore power cable to the robot.

2. Replace the battery inside the robot with a fully charged battery

3. Remove the shore power cable.

This is a quick way to use Spot for periods longer than a single charge.

NOTE: Ensure that the power cable is inserted. Removing the battery without this will cut power to Spot’s computers; they will shut down and may not save log or runtime data.

---

<!-- PDF page 29 -->

*Figure labels: OPERATION*

# OPERATING ENVIRONMENT

## **ENVIRONMENT**

### **Surface type**

### **Space**

## **YES**

- Low carpet (recommended)

- Clean dry pavement

- Unwaxed clean indoor floors

- Ram board-covered flooring

- Grass

- Packed dirt and sand

- Gravel

- Clean open space

- No objects or people in proximity to Spot

- Stay 2m away from Spot when motors are active

WARNING: It’s the operator’s responsibility to only use Spot in a safe environment. These guidelines are for reference only. They don’t describe every unsafe condition. If an environment or robot behavior seems unsafe: STOP.

## **NO**

- Slippery surfaces

   - Wet grass

   - Ice

- Entrapment hazards

   - Rebar mesh

   - Sideways ladders

   - Netting

- Elevated platforms without proper safety barriers

- Moving platforms such as vehicles or elevators

- Confined spaces without room for Spot to maneuver

- Overhanging obstacles

- Objects < 30 cm high that should not be stepped on

- Thin objects < 3 cm

- Glass or clear objects

---

<!-- PDF page 30 -->

|**ENVIRONMENT**|**YES**|**NO**|
|---|---|---|
|**Slopes**|+/- 30 degrees|> 30 or < - 30 degrees|
|**Stairways**|Stair dimensions meeting US<br>building code standards, typically 7”<br>(18 cm) rise for 10-11” (25-28 cm) run|• Stairways with open sides<br>• Stairways with people below|
|**Climate**|• -20C to 45C<br>• Lighting above 2 Lux<br>• Light rain|• Anything outside defined ranges<br>• Do not submerge robot in water|
|**People**|All people at least 2m away<br>from Spot|• Untrained personnel onsite<br>• Children onsite<br>• People below robot operating on<br>elevated ground<br>• People on ladders or scaffolding<br>near robot operating area|
|**RF**|Limited WiFi and<br>cellular interference|• Conferences, sporting events,<br>other environments where<br>crowds and devices may<br>interfere with operator’s ability<br>to control or monitor Spot<br>• Unknown or poor<br>communications performance|

For conditions that may cause Spot to fall, refer to the Safety section on page 11 for details on how to reduce the risk of Spot falling or colliding with people or objects.
