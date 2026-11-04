using UnityEngine;

namespace Colonization.Unit
{
    public class UnitStorage : MonoBehaviour, IUnitStorage
    {
        private Mineral _mineral;
        private int _carriedValue;

        public UnitStorage(Mineral mineral)
        {
            _mineral = mineral;
        }

        public void ReceiveOrePiece(ResourceConfig resourceConfig)
        {
            _carriedValue += resourceConfig.Value;
        }

        public int GiveOre()
        {
            int value = _carriedValue;
            _carriedValue = 0;
            return value;
        }

        private void DisplayMineral(ResourceConfig resourceConfig)
        {
        }
    }
}
