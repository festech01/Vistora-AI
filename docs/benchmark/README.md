# Model acceptance benchmark

The following prompts and two PNG fixtures were authored for this project. They may be used for the controlled benchmark. The two PNGs contain original geometric artwork and no real persons or product marks. No paid generation has been run.

Use funded test tenants only with the owner's written spend cap. For each compatible endpoint, freeze the input, exact model revision, settings, price version and FX quote. Record any capability mismatch as ineligible. Choose a common supported duration and resolution for each pair or report separately if there is no overlap. Repeat each eligible case three times only when the approved budget covers all repetitions. Randomize the viewing order and hide model identity during human review. Keep every failure in the denominator.

| ID | Original prompt | Inspect |
|---|---|---|
| 01 | Wide view of Uyo after a brief rain, an ordinary yellow minibus gliding across a wet road. The camera stays still. | Wheels and reflection move together. |
| 02 | Dawn breaks over a quiet Lagos lagoon. A single wooden canoe moves slowly to the right. | Hull outline stays continuous. |
| 03 | An adult potter in a fictional southeastern Nigerian village shapes a bowl on a turning wheel. Side light follows the clay. | Hand count and clay continuity. |
| 04 | An adult storyteller unfolds a painted cloth showing three fictional animals in a shaded courtyard. One continuous shot. | Animals retain shape as cloth opens. |
| 05 | A plain amber bottle revolves against indigo cloth. A narrow stripe of light moves across the glass, with no lettering. | Specular light and bottle geometry. |
| 06 | A teal enamel kettle pours water into one small white cup. Hold the camera steady. | Water follows the spout and fills the cup. |
| 07 | An adult dancer takes two measured side steps, turns once and stops, full body visible against a blank wall. | Foot contact and limb consistency. |
| 08 | An adult cyclist pedals from left to right past three evenly spaced trees. Track alongside. | Pedal rotation and background parallax. |
| 09 | A fictional adult librarian with short curls, green glasses and a rust cardigan crosses the room and opens a book. | Clothes and glasses remain stable. |
| 10 | An adult drummer in a blue shirt places one wooden drum on a mat, then sits beside it. | One drum throughout. |
| 11 | A deep indigo patterned wrapper turns on a stationary dress form under warm studio light. | Pattern alignment during movement. |
| 12 | An adult tailor rolls out striped fabric and smooths one crease. Top-down camera. | Stripe spacing and hand contact. |
| 13 | Wind pushes ripples across tall grass near a stream. Keep the distant hills still. | Independent foreground motion. |
| 14 | A heron lifts off from a lagoon bank and crosses the frame. Wide locked shot. | Wings, legs and takeoff sequence. |
| 15 | Paper-cut animation of a small blue bus crossing a layered cardboard bridge; keep paper edges visible. | Material and consistent silhouettes. |
| 16 | Stop-motion clay animation of three ochre cubes stacking into a single tower on a teal table. | Object count before and after. |
| 17 | Gentle aerial approach toward the green plateau of a fictional Nigerian highland valley through a thin ribbon of cloud. | Horizon stability and depth. |
| 18 | Static twilight shot of a palm silhouette against a broad coral sky. One star appears as the sky darkens. | Smooth exposure and star count. |
| 19 | Using jar.png, slide the camera slightly right while keeping the green jar and circular label centered. | First-frame fidelity and label shape. |
| 20 | Using valley.png, slowly push into the painted valley and add a faint moving reflection to the stream. | Preserve the original sun, hills and illustration style. |

Create one row per run with prompt ID, endpoint and revision, generation type, asset SHA-256 if applicable, settings, attempt number, provider request ID, accepted and completed timestamps, billed USD, local currency cost, file dimensions, duration, status and reviewer notes. Record visual quality, motion consistency and prompt adherence from 1 (unusable) to 5 (meets all criteria). Two independent reviewers should score each file. Report success rate, median and p95 latency, total actual cost and cost per usable result. Compare like-for-like subsets. Leave unrun cells empty and label them pending.
