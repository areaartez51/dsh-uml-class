using System;
using UnityEngine;

namespace Colonization.Unit
{
    public class Mover : MonoBehaviour, IMover
    {
        private float _speed;
        private float _arrivalThreshold;
        private Tween _tween;

        public void Init(float speed, float arrivalThreshold)
        {
            _speed = speed;
            _arrivalThreshold = arrivalThreshold;
        }

        public void StartMove(Vector3 target, Action executed)
        {
            executed?.Invoke();
        }
    }
}
