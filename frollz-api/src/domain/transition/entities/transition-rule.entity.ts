import { TransitionProfile } from './transition-profile.entity';
import { TransitionState } from './transition-state.entity';

export class TransitionRule {
  constructor(
    public readonly id: number,
    public readonly fromStateId: number,
    public readonly toStateId: number,
    public readonly profileId: number,
    public readonly fromState?: TransitionState,
    public readonly toState?: TransitionState,
    public readonly profile?: TransitionProfile,
  ) {}

  static create(props: {
    id: number;
    fromStateId: number;
    toStateId: number;
    profileId: number;
    fromState?: TransitionState;
    toState?: TransitionState;
    profile?: TransitionProfile;
  }): TransitionRule {
    return new TransitionRule(
      props.id,
      props.fromStateId,
      props.toStateId,
      props.profileId,
      props.fromState,
      props.toState,
      props.profile,
    );
  }
}
