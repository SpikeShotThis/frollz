import { TransitionProfile } from './transition-profile.entity';
import { TransitionState } from './transition-state.entity';

export class TransitionRule {
  constructor(
    public readonly id: string,
    public readonly fromStateId: string,
    public readonly toStateId: string,
    public readonly profileId: string,
    public readonly fromState?: TransitionState,
    public readonly toState?: TransitionState,
    public readonly profile?: TransitionProfile,
  ) {}

  static create(props: {
    id: string;
    fromStateId: string;
    toStateId: string;
    profileId: string;
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
