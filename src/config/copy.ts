/**
 * All user-facing domain wording in one place.
 * Style rules: sentence case, no long dashes, no dot separators, no all caps.
 */
import type { BlastPhase, ObjectKind, SignalType, StoryId } from '@/engine/contract'

export const PRODUCT = {
  name: 'Pit Safety Monitor',
  site: 'Demo pit',
  simulated: 'Simulated data',
}

export const KIND_LABEL: Record<ObjectKind, string> = {
  haulTruck: 'Haul truck',
  excavator: 'Excavator',
  dozer: 'Dozer',
  drillRig: 'Drill rig',
  loader: 'Wheel loader',
  waterTruck: 'Water truck',
  lightVehicle: 'Light vehicle',
  person: 'Person',
  inclinometer: 'Inclinometer well',
  piezometer: 'Piezometer',
  prism: 'Survey prism',
  totalStation: 'Robotic total station',
  radar: 'Slope radar',
  seismic: 'Seismograph',
}

export const SIGNAL_TITLE: Record<SignalType, (ctx: { people: number; vehicles: number }) => string> = {
  blastEntry: ({ people, vehicles }) =>
    people > 0 && vehicles > 0
      ? 'People and equipment inside blast exclusion zone'
      : people > 0
        ? people > 1
          ? 'People inside blast exclusion zone'
          : 'Person inside blast exclusion zone'
        : 'Equipment inside blast exclusion zone',
  groundEntry: ({ people, vehicles }) =>
    people > 0 && vehicles > 0
      ? 'People and equipment inside ground movement zone'
      : people > 0
        ? people > 1
          ? 'People inside ground movement zone'
          : 'Person inside ground movement zone'
        : 'Equipment inside ground movement zone',
  movementLimit: () => 'Ground movement above limit',
  pressureLimit: () => 'Pore pressure above limit',
  engineTemp: () => 'Engine bay temperature high',
  truckFire: () => 'Fire detected on haul truck',
  suppressionFault: () => 'Fire suppression system fault',
  sensorOffline: () => 'Instrument not reporting',
  seismicEvent: () => 'Seismic event detected',
}

/**
 * Response steps of each signal type: 3 to 5 short imperative lines, at most about 48 characters.
 * Each is something the control room does or confirms by radio or on screen, most urgent first
 * (getting people out of harm's way before notifying, checking and logging), so every step can be
 * ticked while the signal is open.
 */
export const CHECKLIST: Record<SignalType, string[]> = {
  blastEntry: [
    'Radio a hold and get the shotfirer to confirm',
    'Radio everyone inside to leave the zone now',
    'Confirm every way into the zone is guarded',
    'Confirm the zone is clear with the shotfirer',
    'Log the breach for investigation',
  ],
  groundEntry: [
    'Radio everyone inside to leave the zone now',
    'Radio all crews that the zone is closed',
    'Ask the supervisor to block access to the zone',
    'Confirm by radio that everyone is out',
  ],
  movementLimit: [
    'Stop work on and below the moving slope',
    'Notify the geotechnical engineer',
    'Check nearby instruments for the same trend',
    "Log the engineer's decision and next inspection",
  ],
  pressureLimit: [
    'Notify the geotechnical engineer',
    'Check slope movement on the same wall',
    'Ask the pump crew to check drainage',
    "Log the engineer's decision and next inspection",
  ],
  engineTemp: [
    'Radio the operator to pull over and shut down',
    'Ask the operator to check for smoke or flames',
    'Check the fire suppression system is ready',
    'Send a mechanic to inspect the engine bay',
    'Keep the truck out of service until cleared',
  ],
  truckFire: [
    'Radio the operator to get out and move upwind',
    'Dispatch the emergency response team',
    'Stop traffic and keep everyone 300 m away',
    'Confirm the operator is clear and unhurt',
    'Confirm the fire is out with the response team',
  ],
  suppressionFault: [
    'Warn the operator that fire suppression may fail',
    'Check the engine bay temperature is normal',
    'Send the truck to the workshop now',
    'Keep the truck out of service until fixed',
  ],
  sensorOffline: [
    'Check if other instruments still cover the area',
    'Notify the geotechnical engineer',
    'Check power and network status remotely',
    'Send a technician to the instrument',
  ],
  seismicEvent: [
    'Radio all crews to move away from the walls',
    'Account for everyone in the pit',
    'Hold blasting and all work near the walls',
    'Notify the geotechnical engineer',
    'Check slope instruments for new movement',
  ],
}

export const BLAST_PHASE_LABEL: Record<BlastPhase, string> = {
  scheduled: 'Scheduled',
  armed: 'Zone armed',
  final: 'Final countdown',
  fired: 'Fired',
  clear: 'All clear',
}

export const STORY_TITLE: Record<StoryId, string> = {
  ground: 'Slope movement',
  blast: 'Blast',
  fire: 'Truck fire',
  seismic: 'Seismic event',
}

export const STORY_HINT: Record<StoryId, string> = {
  ground: 'A well on the west wall accelerates and a dozer drives into its zone',
  blast: 'A blast is armed and a surveyor walks into the exclusion zone',
  fire: 'A haul truck overheats, the fire system releases and the truck pulls over',
  seismic: 'A tremor shakes the pit and a prism on the north west wall speeds up',
}
